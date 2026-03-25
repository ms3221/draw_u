"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export default function HeroSlideshow() {
  const [overlayOn, setOverlayOn] = useState(true);

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
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          overlayOn ? "bg-black/50 opacity-100" : "opacity-0"
        }`}
      />

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

      {/* 오버레이 토글 버튼 */}
      <button
        onClick={() => setOverlayOn((prev) => !prev)}
        className="absolute bottom-6 right-6 z-20 p-2.5 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors duration-200 text-white"
        aria-label={overlayOn ? "오버레이 끄기" : "오버레이 켜기"}
      >
        {overlayOn ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </section>
  );
}
