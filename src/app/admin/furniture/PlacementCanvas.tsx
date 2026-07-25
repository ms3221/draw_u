"use client";

// 캔버스 배치(러프 콜라주) 도구: 본사진 위에 가구 사진을 스티커처럼 얹어
// 위치·크기·회전을 픽셀로 지정한다. 생성 시 이 합성본이 배치 가이드로 모델에 전달된다.

import { useRef, useState } from "react";
import { X, RotateCw } from "lucide-react";

export type CollagePlacement = {
  id: string;
  assetId: string;
  url: string;
  /** 좌상단 x (본사진 너비 대비 0~1, 회전 전 기준) */
  x: number;
  /** 좌상단 y (본사진 높이 대비 0~1, 회전 전 기준) */
  y: number;
  /** 너비 (본사진 너비 대비 0~1) */
  w: number;
  /** 가구 이미지의 세로/가로 비율 */
  aspect: number;
  /** 회전 각도 (deg, 중심 기준) */
  rot: number;
};

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // canvas 합성(toBlob)을 위해 CORS 모드로 로드
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = url;
  });
}

/** 본사진 원본 해상도로 배치 콜라주를 합성해 File 로 반환 (회전 반영) */
export async function compositeCollage(
  baseUrl: string,
  placements: CollagePlacement[]
): Promise<File> {
  const base = await loadImage(baseUrl);
  const W = base.naturalWidth;
  const H = base.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 사용할 수 없습니다.");

  ctx.drawImage(base, 0, 0, W, H);
  for (const p of placements) {
    const img = await loadImage(p.url);
    const sw = p.w * W;
    const sh = sw * p.aspect;
    ctx.save();
    ctx.translate(p.x * W + sw / 2, p.y * H + sh / 2);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  }

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob((b) => res(b), "image/jpeg", 0.9)
  );
  if (!blob) throw new Error("콜라주 합성에 실패했습니다.");
  return new File([blob], "collage.jpg", { type: "image/jpeg" });
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function PlacementCanvas({
  baseUrl,
  placements,
  onChange,
}: {
  baseUrl: string;
  placements: CollagePlacement[];
  onChange: (next: CollagePlacement[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  function startDrag(
    e: React.PointerEvent,
    id: string,
    kind: "move" | "resize" | "rotate"
  ) {
    e.preventDefault();
    e.stopPropagation();
    setActiveId(id);

    const container = containerRef.current;
    const start = placements.find((p) => p.id === id);
    if (!container || !start) return;

    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const snapshot = placements;

    // 회전은 스티커 중심 기준 각도로 계산
    const hPx = start.w * rect.width * start.aspect;
    const centerX = rect.left + (start.x + start.w / 2) * rect.width;
    const centerY = rect.top + start.y * rect.height + hPx / 2;

    function apply(ev: PointerEvent) {
      const dx = (ev.clientX - startX) / rect.width;
      const dy = (ev.clientY - startY) / rect.height;

      let next: CollagePlacement;
      if (kind === "move") {
        // 스티커가 캔버스 밖으로 완전히 나가지 않게만 느슨하게 제한
        const hNorm = hPx / rect.height;
        next = {
          ...start!,
          x: clamp(start!.x + dx, -start!.w * 0.5, 1 - start!.w * 0.5),
          y: clamp(start!.y + dy, -hNorm * 0.5, 1 - hNorm * 0.5),
        };
      } else if (kind === "resize") {
        next = { ...start!, w: clamp(start!.w + dx, 0.05, 1) };
      } else {
        // 핸들이 스티커 상단 중앙에 있으므로 +90도 보정
        const angle =
          (Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * 180) /
            Math.PI +
          90;
        next = { ...start!, rot: Math.round(angle) };
      }
      onChange(snapshot.map((p) => (p.id === id ? next : p)));
    }

    function stop() {
      window.removeEventListener("pointermove", apply);
      window.removeEventListener("pointerup", stop);
    }
    window.addEventListener("pointermove", apply);
    window.addEventListener("pointerup", stop);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none touch-none border border-[#e0e0e0] overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={baseUrl}
        alt="본사진 캔버스"
        draggable={false}
        className="w-full block"
      />
      {placements.map((p, i) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            width: `${p.w * 100}%`,
            transform: `rotate(${p.rot}deg)`,
          }}
          className={activeId === p.id ? "z-20" : "z-10"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.url}
            alt={`배치 가구 ${i + 1}`}
            draggable={false}
            onPointerDown={(e) => startDrag(e, p.id, "move")}
            className="w-full h-auto cursor-move ring-1 ring-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          />
          {/* 회전 핸들 (상단 중앙) */}
          <div
            onPointerDown={(e) => startDrag(e, p.id, "rotate")}
            title="회전"
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#2f2f2f] border border-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <RotateCw size={11} className="text-white" />
          </div>
          <button
            onClick={() => onChange(placements.filter((x) => x.id !== p.id))}
            className="absolute -top-2 -right-2 w-5 h-5 bg-black/70 hover:bg-black text-white flex items-center justify-center rounded-full"
          >
            <X size={11} />
          </button>
          {/* 크기 핸들 (우하단) */}
          <div
            onPointerDown={(e) => startDrag(e, p.id, "resize")}
            title="크기 조절"
            className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-[#2f2f2f] border border-white cursor-nwse-resize"
          />
        </div>
      ))}
    </div>
  );
}
