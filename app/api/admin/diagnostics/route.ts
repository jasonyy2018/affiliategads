import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthorized, unauthorized } from '@/lib/adminAuth';

interface DiagnosticItem {
  id: string;
  category: 'Configuration' | 'Content Integrity' | 'Compliance' | 'Ads Tracking';
  name: string;
  status: 'passed' | 'warning' | 'failed';
  message: string;
  details?: string;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  const diagnostics: DiagnosticItem[] = [];

  // 1. 检查环境变量配置
  const amazonTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
  if (!amazonTag || amazonTag === 'yourtag-20') {
    diagnostics.push({
      id: 'env-amazon-tag',
      category: 'Configuration',
      name: 'Amazon Affiliate Tag',
      status: 'warning',
      message: 'Using default placeholder tag "yourtag-20".',
      details: 'Update NEXT_PUBLIC_AMAZON_AFFILIATE_TAG in .env.local with your real Amazon Associate Tag before scaling ad spend.',
    });
  } else {
    diagnostics.push({
      id: 'env-amazon-tag',
      category: 'Configuration',
      name: 'Amazon Affiliate Tag',
      status: 'passed',
      message: `Configured: ${amazonTag}`,
    });
  }

  const gaConversionId = process.env.NEXT_PUBLIC_GA_CONVERSION_ID;
  if (!gaConversionId || gaConversionId.includes('123456789')) {
    diagnostics.push({
      id: 'env-ga-id',
      category: 'Ads Tracking',
      name: 'Google Ads Conversion ID',
      status: 'warning',
      message: 'Using placeholder Google Ads ID "AW-123456789".',
      details: 'Configure NEXT_PUBLIC_GA_CONVERSION_ID and NEXT_PUBLIC_GA_CONVERSION_LABEL in .env.local for accurate micro-conversion tracking.',
    });
  } else {
    diagnostics.push({
      id: 'env-ga-id',
      category: 'Ads Tracking',
      name: 'Google Ads Conversion ID',
      status: 'passed',
      message: `Configured: ${gaConversionId}`,
    });
  }

  // 2. 检查商品库完整性
  const dataPath = path.join(process.cwd(), 'data', 'products.json');
  const contentDir = path.join(process.cwd(), 'content');

  let productsCount = 0;
  let missingContentCount = 0;

  if (!fs.existsSync(dataPath)) {
    diagnostics.push({
      id: 'data-products-exist',
      category: 'Content Integrity',
      name: 'Products Database (products.json)',
      status: 'failed',
      message: 'data/products.json not found.',
    });
  } else {
    try {
      const products = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      productsCount = products.length;

      diagnostics.push({
        id: 'data-products-count',
        category: 'Content Integrity',
        name: 'Product Database Catalog',
        status: productsCount > 0 ? 'passed' : 'warning',
        message: `Found ${productsCount} product(s) registered in database.`,
      });

      // 验证每个商品的评测文件
      products.forEach((p: any) => {
        const cPath = path.join(contentDir, `${p.slug}.json`);
        if (!fs.existsSync(cPath)) {
          missingContentCount++;
        } else {
          try {
            const content = JSON.parse(fs.readFileSync(cPath, 'utf-8'));
            // 校验核心字段
            const requiredFields = ['headline', 'quick_verdict', 'pros', 'cons', 'specs', 'faqs'];
            const missingFields = requiredFields.filter((f) => !content[f]);
            if (missingFields.length > 0) {
              diagnostics.push({
                id: `content-field-${p.slug}`,
                category: 'Content Integrity',
                name: `Content Schema (${p.slug})`,
                status: 'warning',
                message: `Missing fields in review JSON: ${missingFields.join(', ')}`,
              });
            }
          } catch (err) {
            diagnostics.push({
              id: `content-parse-${p.slug}`,
              category: 'Content Integrity',
              name: `Content JSON Syntax (${p.slug})`,
              status: 'failed',
              message: `Corrupted JSON file for ${p.slug}`,
            });
          }
        }
      });
    } catch (err) {
      diagnostics.push({
        id: 'data-products-parse',
        category: 'Content Integrity',
        name: 'Products JSON Syntax',
        status: 'failed',
        message: 'data/products.json failed JSON parse check.',
      });
    }
  }

  if (missingContentCount > 0) {
    diagnostics.push({
      id: 'content-missing-reviews',
      category: 'Content Integrity',
      name: 'Landing Page Reviews Generated',
      status: 'warning',
      message: `${missingContentCount} product(s) do not have generated review content yet.`,
      details: 'Click "Generate All Reviews" from the action panel to create them automatically.',
    });
  } else if (productsCount > 0) {
    diagnostics.push({
      id: 'content-missing-reviews',
      category: 'Content Integrity',
      name: 'Landing Page Reviews Generated',
      status: 'passed',
      message: `100% of registered products have generated landing page content ready.`,
    });
  }

  // 3. 检查合规要素 (Amazon Associate Disclaimer & rel=sponsored)
  const ctaButtonFile = path.join(process.cwd(), 'components', 'AmazonCTAButton.tsx');
  if (fs.existsSync(ctaButtonFile)) {
    const ctaCode = fs.readFileSync(ctaButtonFile, 'utf-8');
    const hasSponsored = ctaCode.includes('rel="sponsored nofollow noopener"');
    const hasTargetBlank = ctaCode.includes('target="_blank"');

    if (hasSponsored && hasTargetBlank) {
      diagnostics.push({
        id: 'compliance-cta-rel',
        category: 'Compliance',
        name: 'Amazon Outbound Link Compliance',
        status: 'passed',
        message: 'Strict rel="sponsored nofollow noopener" and target="_blank" enabled on all CTA buttons.',
      });
    } else {
      diagnostics.push({
        id: 'compliance-cta-rel',
        category: 'Compliance',
        name: 'Amazon Outbound Link Compliance',
        status: 'failed',
        message: 'Missing sponsored or nofollow attributes on outbound affiliate buttons.',
      });
    }
  }

  const disclaimerFile = path.join(process.cwd(), 'components', 'DisclaimerFooter.tsx');
  if (fs.existsSync(disclaimerFile)) {
    const footerCode = fs.readFileSync(disclaimerFile, 'utf-8');
    const hasAssociateNotice = footerCode.includes('As an Amazon Associate I earn from qualifying purchases');

    if (hasAssociateNotice) {
      diagnostics.push({
        id: 'compliance-disclaimer',
        category: 'Compliance',
        name: 'Amazon Associates Legal Disclaimer',
        status: 'passed',
        message: 'Official Amazon Associates mandatory disclosure is present in footer.',
      });
    } else {
      diagnostics.push({
        id: 'compliance-disclaimer',
        category: 'Compliance',
        name: 'Amazon Associates Legal Disclaimer',
        status: 'failed',
        message: 'Mandatory Amazon Associate disclosure text is missing.',
      });
    }
  }

  // 综合健康评分
  const total = diagnostics.length;
  const passed = diagnostics.filter((d) => d.status === 'passed').length;
  const warnings = diagnostics.filter((d) => d.status === 'warning').length;
  const errors = diagnostics.filter((d) => d.status === 'failed').length;
  const healthScore = total > 0 ? Math.round((passed / total) * 100) : 0;

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    healthScore,
    stats: { total, passed, warnings, errors },
    diagnostics,
  });
}
