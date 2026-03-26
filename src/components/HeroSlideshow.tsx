"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
// import { Film, Images } from "lucide-react";

const slides = [
  { url: "/images/home/1.jpg", alt: "인테리어 1" },
  { url: "/images/home/2.jpg", alt: "인테리어 2" },
  { url: "/images/home/3.jpg", alt: "인테리어 3" },
  { url: "/images/home/4.jpg", alt: "인테리어 4" },
  { url: "/images/home/5.jpg", alt: "인테리어 5" },
];

export default function HeroSlideshow() {
  // const [mode, setMode] = useState<"video" | "slide">("video");
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-screen min-h-150 overflow-hidden">
      {/* 비디오 배경 — 나중에 다시 사용할 수 있으므로 주석 처리 */}
      {/* <video
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          mode === "video" ? "opacity-100" : "opacity-0"
        }`}
        src="https://cdn.fastseller.shop/uploads/drawu_home.mp4"
        autoPlay
        loop
        muted
        playsInline
      /> */}

      {/* 슬라이드 이미지들 */}
      {slides.map((slide, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1500 ease-in-out`}
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
            상담신청
          </Button>
        </Link>
      </div>

      {/* 하단 컨트롤 */}
      <div className="absolute bottom-8 right-12 z-20 flex items-center gap-3">
        {/* 슬라이드 인디케이터 */}
        <div className="flex items-center gap-2 mr-2">
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

        {/* 모드 토글 버튼 — 나중에 다시 사용할 수 있으므로 주석 처리 */}
        {/* <button
          onClick={() => setMode((prev) => (prev === "video" ? "slide" : "video"))}
          className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors duration-200 text-white"
          aria-label={mode === "video" ? "이미지 슬라이드로 전환" : "비디오로 전환"}
        >
          {mode === "video" ? <Images size={18} /> : <Film size={18} />}
        </button> */}
      </div>
    </section>
  );
}
