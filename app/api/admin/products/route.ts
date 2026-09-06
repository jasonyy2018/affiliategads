import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthorized, unauthorized } from '@/lib/adminAuth';

const DATA_FILE = path.join(process.cwd(), 'data', 'products.json');
const CONTENT_DIR = path.join(process.cwd(), 'content');

export interface ProductItem {
  asin: string;
  title: string;
  brand: string;
  price: number;
  commission_rate: number;
  image_url: string;
  bullets: string[];
  review_summary: string;
  slug: string;
}

function readProducts(): ProductItem[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    console.error('Failed to read products.json:', err);
    return [];
  }
}

function writeProducts(products: ProductItem[]): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf-8');
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  const products = readProducts();
  const enriched = products.map((p) => {
    const contentPath = path.join(CONTENT_DIR, `${p.slug}.json`);
    const hasContent = fs.existsSync(contentPath);
    let contentData = null;
    if (hasContent) {
      try {
        contentData = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
      } catch {}
    }
    const commissionPerSale = p.price * p.commission_rate;
    // 假设 2% 转化率下的单次点击预期毛利 (未扣除 CPC)
    const expectedRevenuePerClick = commissionPerSale * 0.02;

    return {
      ...p,
      hasContent,
      rating: contentData?.rating ?? 4.8,
      ratingCount: contentData?.rating_count ?? 0,
      commissionPerSale: Number(commissionPerSale.toFixed(2)),
      expectedRevenuePerClick: Number(expectedRevenuePerClick.toFixed(3)),
    };
  });

  return NextResponse.json({ success: true, products: enriched });
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  try {
    const body: ProductItem = await req.json();
    if (!body.asin || !body.title || !body.slug) {
      return NextResponse.json(
        { success: false, error: 'ASIN, Title, and Slug are required.' },
        { status: 400 }
      );
    }

    const products = readProducts();
    const existingIndex = products.findIndex((p) => p.slug === body.slug || p.asin === body.asin);

    if (existingIndex >= 0) {
      products[existingIndex] = { ...products[existingIndex], ...body };
    } else {
      products.push(body);
    }

    writeProducts(products);
    return NextResponse.json({ success: true, message: 'Product saved successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required.' }, { status: 400 });
    }

    const products = readProducts();
    const filtered = products.filter((p) => p.slug !== slug);
    writeProducts(filtered);

    // 同步删除生成的 content 缓存
    const contentPath = path.join(CONTENT_DIR, `${slug}.json`);
    if (fs.existsSync(contentPath)) {
      fs.unlinkSync(contentPath);
    }

    return NextResponse.json({ success: true, message: 'Product and content deleted.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
