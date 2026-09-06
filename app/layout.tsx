import type { Metadata } from "next";
import "./globals.css";
import { GoogleAdsTracker } from "@/components/GoogleAdsTracker";
import { PostHogProvider } from "@/components/PostHogProvider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Expert Buyer Guides & Lab-Tested Product Reviews (2026) | PrimeReviewLab",
    template: "%s | PrimeReviewLab",
  },
  description:
    "Unbiased, lab-benchmarked product evaluations, head-to-head comparison matrices, and real-time deal alerts for outdoor gear.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    siteName: "PrimeReviewLab",
    type: "website",
    url: siteUrl,
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
