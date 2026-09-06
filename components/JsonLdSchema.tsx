import React from 'react';

interface JsonLdSchemaProps {
  title: string;
  description: string;
  url: string;
  breadcrumbs: Array<{ name: string; url: string }>;
  products: Array<{
    title: string;
    brand: string;
    price: number;
    image_url: string;
    rating: number;
    review_count: number;
    asin: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export default function JsonLdSchema({
  title,
  description,
  url,
  breadcrumbs,
  products,
  faqs,
}: JsonLdSchemaProps) {
  // BreadcrumbList Schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };

  // ItemList / Product Schema
  // 注意：不带 aggregateRating —— 这些是编辑评测而非用户评分聚合，
  // 挂自评 aggregateRating 违反 Google 富结果政策，有手动处罚风险。
  // offer url 走环境变量 tag（服务端渲染时读取）。
  const affiliateTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || 'jyu0a-20';
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description: description,
    itemListElement: products.map((prod, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Product',
        name: prod.title,
        image: prod.image_url,
        brand: {
          '@type': 'Brand',
          name: prod.brand,
        },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'USD',
          price: prod.price,
          availability: 'https://schema.org/InStock',
          url: `https://www.amazon.com/dp/${prod.asin}?tag=${affiliateTag}`,
        },
      },
    })),
  };

  // FAQPage Schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
    </>
  );
}
