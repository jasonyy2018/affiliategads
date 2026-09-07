import type { Metadata } from "next";
import "./globals.css";
import { GoogleAdsTracker } from "@/components/GoogleAdsTracker";
import { PostHogProvider } from "@/components/PostHogProvider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aads.togomol.com";
const gaId = process.env.NEXT_PUBLIC_GA_CONVERSION_ID || "AW-17885747857";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Expert Buyer Guides & Lab-Tested Product Reviews (2026) | PrimeReviewLab",
    template: "%s | PrimeReviewLab",
  },
  description:
    "Unbiased, lab-benchmarked product evaluations, head-to-head comparison matrices, and real-time deal alerts for outdoor gear.",
  authors: [{ name: "WSAI & WCKJ" }],
  creator: "WSAI & WCKJ",
  publisher: "WSAI & WCKJ",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    siteName: "PrimeReviewLab",
    type: "website",
    url: siteUrl,
  },
  verification: {
    other: {
      "msvalidate.01": "334AD38D1048CA468EE60121B2617001",
    },
  },
  other: {
    "msvalidate.01": "334AD38D1048CA468EE60121B2617001",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) - 直接原生注入 <head> 第一行，满足 Google Ads 探测爬虫严格检测 */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `,
          }}
        />
        <meta name="msvalidate.01" content="334AD38D1048CA468EE60121B2617001" />
        <link rel="preconnect" href="https://m.media-amazon.com" />
        <link rel="preconnect" href="https://images-na.ssl-images-amazon.com" />
      </head>
      <body
        className="min-h-screen bg-white text-gray-900 antialiased flex flex-col justify-between"
        suppressHydrationWarning
      >
        <PostHogProvider>
          <GoogleAdsTracker />
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
