import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import ConditionalFooter from "@/components/ConditionalFooter";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.draw-u.kr"),
  title: {
    default: "draw_u | 인테리어 전문 기업",
    template: "%s | draw_u",
  },
  description: "신뢰와 기술로 완성하는 인테리어 전문 기업 draw_u. 공간을 짓고, 가치를 완성합니다.",
  keywords: ["인테리어", "리모델링", "인테리어 전문", "draw_u", "드로우유", "공간 설계"],
  authors: [{ name: "draw_u" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://www.draw-u.kr",
    siteName: "draw_u",
    title: "draw_u | 인테리어 전문 기업",
    description: "신뢰와 기술로 완성하는 인테리어 전문 기업 draw_u.",
    images: [{ url: "/images/logo.png", width: 1200, height: 630, alt: "draw_u" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "draw_u | 인테리어 전문 기업",
    description: "신뢰와 기술로 완성하는 인테리어 전문 기업 draw_u.",
    images: ["/images/logo.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://www.draw-u.kr" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <ConditionalFooter />
      </body>
    </html>
  );
}
