"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { Star, X } from "lucide-react";

interface SortableImageProps {
  url: string;
  index: number;
  isThumbnail: boolean;
  onSetThumbnail: () => void;
  onRemove: () => void;
}

export default function SortableImage({
  url,
  index,
  isThumbnail,
  onSetThumbnail,
  onRemove,
}: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* 드래그 영역 */}
      <div
        {...attributes}
        {...listeners}
        className="relative aspect-square overflow-hidden bg-[#f5f5f5] cursor-grab active:cursor-grabbing"
      >
        <Image
          src={url}
          alt={`이미지 ${index + 1}`}
          fill
          className="object-cover pointer-events-none"
          sizes="150px"
          draggable={false}
        />
      </div>

      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 pointer-events-none">
        <button
          type="button"
          onClick={onSetThumbnail}
          className={`p-1.5 rounded-full pointer-events-auto ${
            isThumbnail
              ? "bg-yellow-400 text-black"
              : "bg-white/80 text-[#555] hover:bg-white"
          }`}
          title="대표 이미지로 지정"
        >
          <Star size={14} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-full bg-white/80 text-red-500 hover:bg-white pointer-events-auto"
          title="삭제"
        >
          <X size={14} />
        </button>
      </div>

      {/* 대표 이미지 표시 */}
      {isThumbnail && (
        <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[9px] px-1.5 py-0.5 font-medium">
          대표
        </div>
      )}

      {/* 순서 번호 */}
      <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded">
        {index + 1}
      </div>
    </div>
  );
}
