import type { Metadata } from "next";
import HeroSlideshow from "@/components/HeroSlideshow";

export const metadata: Metadata = {
  title: "드로우유 인테리어 | 취향을 듣고, 생활을 담아 공간을 그립니다",
  description:
    "드로우유(DRAWU) 인테리어 - 취향을 듣고, 생활을 담아 공간을 그립니다. 인테리어 설계부터 시공까지 전문 서비스를 제공합니다.",
  alternates: { canonical: "https://www.draw-u.kr" },
};

export default function Home() {
  return <HeroSlideshow />;
}
