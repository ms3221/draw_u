import type { Metadata } from "next";
import HeroSlideshow from "@/components/HeroSlideshow";

export const metadata: Metadata = {
  title: "공간을 짓고, 가치를 완성합니다",
  description: "신뢰와 기술로 완성하는 인테리어 전문 기업 draw_u. 공간을 짓고, 가치를 완성합니다.",
  alternates: { canonical: "https://www.draw-u.kr" },
};

export default function Home() {
  return <HeroSlideshow />;
}
