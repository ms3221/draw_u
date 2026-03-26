import type { Metadata } from "next";
import "./globals.css";
import ConditionalHeader from "@/components/ConditionalHeader";
import ConditionalFooter from "@/components/ConditionalFooter";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.draw-u.kr"),
  title: {
    default: "DRAW_U INTERIOR CO.",
    template: "%s | draw_u",
  },
  description: "취향을 듣고, 생활을 담아 공간을 그립니다.",
  keywords: ["인테리어", "리모델링", "인테리어 전문", "draw_u", "드로우유", "공간 설계"],
  authors: [{ name: "draw_u" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://www.draw-u.kr",
    siteName: "draw_u",
    title: "DRAW_U INTERIOR CO.",
    description: "취향을 듣고, 생활을 담아 공간을 그립니다.",
    images: [{ url: "/images/logo.png", width: 1200, height: 630, alt: "draw_u" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DRAW_U INTERIOR CO.",
    description: "취향을 듣고, 생활을 담아 공간을 그립니다.",
    images: ["/images/logo.png"],
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
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ConditionalHeader />
        <main className="flex-1">{children}</main>
        <ConditionalFooter />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
