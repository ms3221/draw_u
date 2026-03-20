"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const slides = [
  {
    url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1920&q=80",
    alt: "밝고 넓은 거실 인테리어",
  },
  {
    url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1920&q=80",
    alt: "미니멀 다이닝룸",
  },
  {
    url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1920&q=80",
    alt: "모던 침실",
  },
  {
    url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1920&q=80",
    alt: "럭셔리 주방",
  },
  {
    url: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1920&q=80",
    alt: "고급 욕실",
  },
];

export default function HeroSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-screen min-h-[600px] overflow-hidden">
      {/* 슬라이드 이미지들 */}
      {slides.map((slide, idx) => (
        <div
          key={idx}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[1500ms] ease-in-out"
          style={{
            backgroundImage: `url('${slide.url}')`,
            opacity: idx === current ? 1 : 0,
          }}
          aria-hidden={idx !== current}
        />
      ))}

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
            견적 문의하기
          </Button>
        </Link>
      </div>

      {/* 슬라이드 인디케이터 — 우하단 */}
      <div className="absolute bottom-8 right-12 z-10 flex items-center gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            aria-label={`슬라이드 ${idx + 1}`}
            className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
              idx === current
                ? "bg-white scale-125"
                : "bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
