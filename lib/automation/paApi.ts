/**
 * Amazon Product Advertising API 5.0 客户端（价格快照数据源）。
 *
 * 需要 5 个凭证（Amazon Associates → PA-API）：
 *   PA_ACCESS_KEY / PA_SECRET_KEY / PA_PARTNER_TAG / PA_HOST / PA_REGION
 * 未配置时调用方自动回退到 products.json 基线价。
 *
 * PA-API 5.0 使用 AWS SigV4 签名，纯 crypto 实现无 SDK 依赖。
 */
import crypto from 'crypto';

const SERVICE = 'ProductAdvertisingAPI';
const HOST = process.env.PA_HOST || 'webservices.amazon.com';
const REGION = process.env.PA_REGION || 'us-east-1';
const MARKETPLACE = 'www.amazon.com';

function getCredentials() {
  const accessKey = process.env.PA_ACCESS_KEY;
  const secretKey = process.env.PA_SECRET_KEY;
  const partnerTag = process.env.PA_PARTNER_TAG || process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
  return { accessKey, secretKey, partnerTag };
}

export function isPaApiConfigured(): boolean {
  const { accessKey, secretKey, partnerTag } = getCredentials();
  return Boolean(accessKey && secretKey && partnerTag);
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function signRequest(method: string, pathName: string, queryParams: string, payload: string, amzDate: string, dateStamp: string, secretKey: string): string {
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems\n`;
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';

  const canonicalRequest = [
    method,
    pathName,
    queryParams,
    canonicalHeaders,
    signedHeaders,
    sha256Hex(payload),
  ].join('\n');

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, 'aws4_request');

  return crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');
}

export interface PaApiPrice {
  asin: string;
  price: number | null;
  currency: string;
  availability: string;
  title: string;
  imageUrl: string | null;
}

/**
 * 批量查询 ASIN 的实时价格（每批最多 10 个，PA-API 限制）。
 * 失败时抛异常，由调用方降级。
 */
export async function getItemsPrices(asins: string[]): Promise<PaApiPrice[]> {
  const { accessKey, secretKey, partnerTag } = getCredentials();
  if (!accessKey || !secretKey || !partnerTag) {
    throw new Error('PA-API not configured (PA_ACCESS_KEY / PA_SECRET_KEY / PA_PARTNER_TAG).');
  }
  if (asins.length > 10) {
    throw new Error('PA-API allows max 10 ASINs per request.');
  }

  const payload = JSON.stringify({
    ItemIds: asins,
    Resources: [
      'ItemInfo.Title',
      'ItemInfo.Feature',
      'Offers.Listings.Price',
      'Offers.Listings.Availability.Message',
      'Images.Primary.Large',
    ],
  });

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const target = '/paapi5/getitems';

  const signature = signRequest('POST', target, '', payload, amzDate, dateStamp, secretKey);

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${dateStamp}/${REGION}/${SERVICE}/aws4_request, ` +
    `SignedHeaders=content-encoding;content-type;host;x-amz-date;x-amz-target, ` +
    `Signature=${signature}`;

  const res = await fetch(`https://${HOST}${target}`, {
    method: 'POST',
    headers: {
      'content-encoding': 'amz-1.0',
      'content-type': 'application/json; charset=utf-8',
      host: HOST,
      'x-amz-date': amzDate,
      'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
      Authorization: authorization,
    },
    body: payload,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`PA-API HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const items: any[] = data.ItemsResult?.Items || [];

  return items.map((item) => {
    const listing = item.Offers?.Listings?.[0];
    return {
      asin: item.ASIN,
      price: listing?.Price?.Amount ?? null,
      currency: listing?.Price?.Currency || 'USD',
      availability: listing?.Availability?.Message || '',
      title: item.ItemInfo?.Title?.DisplayValue || '',
      imageUrl: item.Images?.Primary?.Large?.URL || null,
    };
  });
}
