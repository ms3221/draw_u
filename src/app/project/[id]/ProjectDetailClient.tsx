"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Project } from "@/lib/supabase/types";

export default function ProjectDetailClient({
  project,
}: {
  project: Project;
}) {
  const allImages = project.thumbnail_url
    ? [project.thumbnail_url, ...project.images]
    : project.images;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = allImages[selectedIndex];

  const details = project.details as Record<string, unknown>;

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

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
            {/* 왼쪽: 이미지 갤러리 */}
            <div>
              {/* 메인 이미지 */}
              {selectedImage && (
                <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f5f5]">
                  <Image
                    src={selectedImage}
                    alt={`${project.name} - ${selectedIndex + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 860px"
                    priority
                  />
                </div>
              )}

              {/* 썸네일 그리드 */}
              {allImages.length > 1 && (
                <div className="grid grid-cols-5 md:grid-cols-6 gap-2 mt-3">
                  {allImages.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedIndex(i)}
                      className={`relative aspect-square overflow-hidden bg-[#f5f5f5] ${
                        i === selectedIndex
                          ? "ring-2 ring-[#2f2f2f]"
                          : "opacity-60 hover:opacity-100"
                      } transition-opacity duration-200`}
                    >
                      <Image
                        src={url}
                        alt={`${project.name} 썸네일 ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="100px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 오른쪽: 프로젝트 정보 */}
            <div>
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

              <Separator className="bg-[#e0e0e0] h-px mb-6" />

              {/* 세부정보 */}
              {Object.keys(details).length > 0 && (
                <div className="space-y-4 mb-8">
                  {Object.entries(details).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-[11px] tracking-[0.15em] uppercase text-[#999] mb-1">
                        {key}
                      </p>
                      {typeof value === "object" && value !== null ? (
                        <div className="space-y-1">
                          {Object.entries(
                            value as Record<string, string>
                          ).map(([subKey, subValue]) => (
                            <p
                              key={subKey}
                              className="text-[13px] text-[#555]"
                            >
                              <span className="text-[#999]">{subKey}</span>{" "}
                              &mdash; {subValue}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13px] text-[#555]">
                          {String(value)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 설명 */}
              {project.description && (
                <>
                  <Separator className="bg-[#e0e0e0] h-px mb-6" />
                  <div className="text-[13px] text-[#555] leading-[1.9] whitespace-pre-line">
                    {project.description}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
