"use client";

// 영역 표시(브러시 마스킹) 도구: 보정할 이미지 위에 반투명 빨간 브러시로 칠해
// "여기"를 지정한다. 생성 시 원본 + 표시가 합성된 안내 이미지가 모델에 전달된다.

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Eraser } from "lucide-react";
import { loadImage } from "./PlacementCanvas";

export type MaskCanvasHandle = {
  /** 표시가 있으면 원본+표시 합성 이미지를 반환, 없으면 null */
  exportAnnotated: () => Promise<File | null>;
  clear: () => void;
};

// 이미지 너비 대비 브러시 굵기
const BRUSHES = [
  { label: "가는 붓", ratio: 0.02 },
  { label: "중간 붓", ratio: 0.045 },
  { label: "굵은 붓", ratio: 0.08 },
];

const MASK_COLOR = "rgba(255, 40, 40, 0.5)";

const MaskCanvas = forwardRef<
  MaskCanvasHandle,
  { imageUrl: string; onDirtyChange?: (dirty: boolean) => void }
>(function MaskCanvas({ imageUrl, onDirtyChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [brush, setBrush] = useState(1);
  const [dirty, setDirty] = useState(false);

  function markDirty(v: boolean) {
    setDirty(v);
    onDirtyChange?.(v);
  }

  // 이미지 로드 후 캔버스 내부 해상도를 원본 크기에 맞춘다
  function setupCanvas() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.naturalWidth) return;
    if (canvas.width !== img.naturalWidth) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
  }

  function pointFromEvent(e: React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function drawStroke(to: { x: number; y: number }) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.strokeStyle = MASK_COLOR;
    ctx.fillStyle = MASK_COLOR;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = canvas.width * BRUSHES[brush].ratio;

    const from = lastPoint.current ?? to;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    lastPoint.current = to;
  }

  useImperativeHandle(ref, () => ({
    async exportAnnotated() {
      const canvas = canvasRef.current;
      if (!canvas || !dirty) return null;

      const base = await loadImage(imageUrl);
      const out = document.createElement("canvas");
      out.width = base.naturalWidth;
      out.height = base.naturalHeight;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("캔버스를 사용할 수 없습니다.");

      ctx.drawImage(base, 0, 0, out.width, out.height);
      ctx.drawImage(canvas, 0, 0, out.width, out.height);

      const blob = await new Promise<Blob | null>((res) =>
        out.toBlob((b) => res(b), "image/jpeg", 0.9)
      );
      if (!blob) throw new Error("표시 이미지 합성에 실패했습니다.");
      return new File([blob], "masked.jpg", { type: "image/jpeg" });
    },
    clear() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      markDirty(false);
    },
  }));

  return (
    <div>
      <div className="relative w-full touch-none select-none border border-[#e0e0e0] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageUrl}
          alt="영역 표시 대상"
          draggable={false}
          onLoad={setupCanvas}
          className="w-full block"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            lastPoint.current = null;
            drawStroke(pointFromEvent(e));
            markDirty(true);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            drawStroke(pointFromEvent(e));
          }}
          onPointerUp={() => {
            drawing.current = false;
            lastPoint.current = null;
          }}
        />
      </div>

      <div className="flex items-center gap-2 mt-2">
        {BRUSHES.map((b, i) => (
          <button
            key={b.label}
            onClick={() => setBrush(i)}
            className={`h-[30px] px-3 border text-[12px] transition-colors ${
              brush === i
                ? "border-[#2f2f2f] bg-[#2f2f2f] text-white"
                : "border-[#e0e0e0] text-[#666] hover:border-[#bbb]"
            }`}
          >
            {b.label}
          </button>
        ))}
        <button
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            markDirty(false);
          }}
          className="h-[30px] px-3 border border-[#e0e0e0] text-[12px] text-[#666] hover:border-[#bbb] flex items-center gap-1 ml-auto"
        >
          <Eraser size={12} />
          전체 지우기
        </button>
      </div>
    </div>
  );
});

export default MaskCanvas;
