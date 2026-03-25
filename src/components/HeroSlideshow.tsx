"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HeroSlideshow() {
  return (
    <section className="relative h-screen min-h-[600px] overflow-hidden">
      {/* 배경 비디오 */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="https://cdn.fastseller.shop/uploads/drawu_home.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* 다크 오버레이 */}
      <div className="absolute inset-0 bg-black/50" />

      {/* 히어로 콘텐츠 — 중앙 */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white text-center px-6">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-8">
          취향을 듣고,
          <br />
          생활을 담아 공간을 그립니다.
        </h1>
        <Link href="/contact">
          <Button
            size="lg"
            variant="outline"
            className="rounded-full border-white text-white bg-transparent hover:bg-white hover:text-[#2f2f2f] transition-all duration-200 px-10 py-5 text-[12px] tracking-[0.15em] font-bold cursor-pointer"
          >
            상담신청
          </Button>
        </Link>
      </div>
    </section>
  );
}
