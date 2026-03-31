import type { Metadata } from "next";
import "./globals.css";
import ConditionalHeader from "@/components/ConditionalHeader";
import ConditionalFooter from "@/components/ConditionalFooter";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.draw-u.kr"),
  title: {
    default: "드로우유 (DRAWU) | 인테리어 전문 업체",
    template: "%s | 드로우유 DRAWU",
  },
  description:
    "드로우유(DRAWU) - 취향을 듣고, 생활을 담아 공간을 그립니다. 인테리어 설계부터 시공까지, 당신만의 공간을 만들어 드립니다.",
  keywords: [
    "드로우유",
    "DRAWU",
    "인테리어",
    "리모델링",
    "인테리어 전문",
    "공간 설계",
    "인테리어 시공",
    "주거 인테리어",
    "상업 인테리어",
  ],
  authors: [{ name: "드로우유 DRAWU" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://www.draw-u.kr",
    siteName: "드로우유 DRAWU",
    title: "드로우유 (DRAWU) | 인테리어 전문 업체",
    description:
      "드로우유(DRAWU) - 취향을 듣고, 생활을 담아 공간을 그립니다. 인테리어 설계부터 시공까지, 당신만의 공간을 만들어 드립니다.",
    images: [
      { url: "/images/og.png", width: 1200, height: 630, alt: "드로우유 DRAWU 인테리어" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "드로우유 (DRAWU) | 인테리어 전문 업체",
    description:
      "드로우유(DRAWU) - 취향을 듣고, 생활을 담아 공간을 그립니다. 인테리어 설계부터 시공까지, 당신만의 공간을 만들어 드립니다.",
    images: ["/images/og.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://www.draw-u.kr" },
  verification: {
    other: { "naver-site-verification": "17c4cda2fedc99b8f2a8e80f88f41a4d078cc7ab" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "드로우유 DRAWU",
    alternateName: "DRAWU INTERIOR CO.",
    description:
      "드로우유(DRAWU) - 취향을 듣고, 생활을 담아 공간을 그립니다. 인테리어 설계부터 시공까지 전문 서비스.",
    url: "https://www.draw-u.kr",
    image: "https://www.draw-u.kr/images/og.png",
    "@id": "https://www.draw-u.kr",
    priceRange: "$$",
    areaServed: { "@type": "Country", name: "KR" },
    serviceType: ["인테리어 설계", "인테리어 시공", "리모델링", "공간 설계"],
    sameAs: [],
  };

  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ConditionalHeader />
        <main className="flex-1">{children}</main>
        <ConditionalFooter />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
