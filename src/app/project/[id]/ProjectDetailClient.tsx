"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Project } from "@/lib/supabase/types";

export default function ProjectDetailClient({
  project,
}: {
  project: Project;
}) {
  const allImages = project.images;

  const rawDetails = project.details as Record<string, unknown>;

  // Material을 최상단으로, 나머지는 원래 순서 유지
  const detailOrder = ["Material", "Size", "Year", "Location"];
  const sortedKeys = [
    ...detailOrder.filter((k) => k in rawDetails),
    ...Object.keys(rawDetails).filter((k) => !detailOrder.includes(k)),
  ];
  const details = Object.fromEntries(sortedKeys.map((k) => [k, rawDetails[k]]));

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % allImages.length : null
    );
  }, [allImages.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null
        ? (prev - 1 + allImages.length) % allImages.length
        : null
    );
  }, [allImages.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [lightboxIndex, closeLightbox, goNext, goPrev]);

  return (
    <div className="min-h-screen bg-white pt-[100px]">
      <section className="py-16 px-6">
        <div className="max-w-[1280px] mx-auto">
          {/* 뒤로가기 */}
          <Link
            href="/project"
            className="inline-flex items-center gap-2 text-[12px] tracking-[0.1em] text-[#999] hover:text-[#2f2f2f] transition-colors duration-200 mb-10"
          >
            <ArrowLeft size={14} />
            목록으로
          </Link>

          {/* 상단: 프로젝트 정보 */}
          <div className="mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-2">
              Project
            </p>
            <h1 className="text-2xl font-bold text-[#2f2f2f] mb-4">
              {project.name}
            </h1>

            {project.address && (
              <p className="text-[13px] text-[#888] mb-6">
                {project.address}
              </p>
            )}

            {Object.keys(details).length > 0 && (
              <>
                <Separator className="bg-[#e0e0e0] h-px mb-6" />
                <table className="text-[13px]">
                  <tbody>
                    {Object.entries(details).map(([key, value]) => (
                      <tr key={key} className="align-top">
                        <td className="font-semibold text-[#2f2f2f] pr-3 py-1.5 whitespace-nowrap">
                          {key}
                        </td>
                        <td className="text-[#ccc] pr-3 py-1.5">┃</td>
                        <td className="text-[#555] py-1.5">
                          {typeof value === "object" && value !== null ? (
                            <div className="space-y-0.5">
                              {Object.entries(
                                value as Record<string, string>
                              ).map(([subKey, subValue]) => (
                                <p key={subKey}>
                                  <span className="text-[#bbb]">○</span>{" "}
                                  {subKey} – {subValue}
                                </p>
                              ))}
                            </div>
                          ) : (
                            String(value)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {project.description && (
              <>
                <Separator className="bg-[#e0e0e0] h-px my-6" />
                <div className="text-[13px] text-[#555] leading-[1.9] whitespace-pre-line">
                  {project.description}
                </div>
              </>
            )}
          </div>

          {/* 하단: 이미지 그리드 */}
          {allImages.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allImages.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className="relative aspect-[4/3] overflow-hidden bg-[#f5f5f5] cursor-pointer group"
                >
                  <Image
                    src={url}
                    alt={`${project.name} - ${i + 1}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    loading={i === 0 ? "eager" : "lazy"}
                    priority={i === 0}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 라이트박스 */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* 닫기 */}
          <button
            onClick={closeLightbox}
            className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors z-10"
          >
            <X size={28} />
          </button>

          {/* 카운터 */}
          <p className="absolute top-6 left-1/2 -translate-x-1/2 text-white/50 text-[12px] tracking-[0.1em]">
            {lightboxIndex + 1} / {allImages.length}
          </p>

          {/* 이전 */}
          {allImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 text-white/50 hover:text-white transition-colors"
            >
              <ChevronLeft size={36} />
            </button>
          )}

          {/* 이미지 */}
          <div
            className="relative w-[90vw] h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={allImages[lightboxIndex]}
              alt={`${project.name} - ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {/* 다음 */}
          {allImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 text-white/50 hover:text-white transition-colors"
            >
              <ChevronRight size={36} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
