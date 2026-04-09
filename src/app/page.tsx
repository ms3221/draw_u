import type { Metadata } from "next";
import HeroSlideshow from "@/components/HeroSlideshow";

export const metadata: Metadata = {
  title: "드로우유 인테리어 | 취향을 듣고, 생활을 담아 공간을 그립니다",
  description:
    "드로우유(DRAWU) 인테리어 - 취향을 듣고, 생활을 담아 공간을 그립니다. 인테리어 설계부터 시공까지 전문 서비스를 제공합니다.",
  alternates: { canonical: "https://www.draw-u.kr" },
};

export default function Home() {
  return (
    <>
      <HeroSlideshow />
      {/* 네이버 크롤러용 SSR 텍스트 — 시각적으로 숨기되 크롤러가 읽을 수 있도록 */}
      <div className="sr-only" aria-hidden="false">
        <h2>드로우유 (DRAWU) 인테리어</h2>
        <p>
          드로우유는 취향을 듣고, 생활을 담아 공간을 그리는 인테리어 전문
          업체입니다. 인테리어 설계부터 시공까지, 드로우유가 당신만의 공간을
          만들어 드립니다. 주거 인테리어, 상업 인테리어, 리모델링, 공간 설계 등
          다양한 인테리어 서비스를 제공합니다.
        </p>
      </div>
    </>
  );
}
