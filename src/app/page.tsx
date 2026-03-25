import type { Metadata } from "next";
import HeroSlideshow from "@/components/HeroSlideshow";

export const metadata: Metadata = {
  title: "취향을 듣고, 생활을 담아 공간을 그립니다.",
  description: "취향을 듣고, 생활을 담아 공간을 그립니다.",
  alternates: { canonical: "https://www.draw-u.kr" },
};

export default function Home() {
  return <HeroSlideshow />;
}
