"use client";

import Link from "next/link";
import Image from "next/image";
import type { Project } from "@/lib/supabase/types";

export default function ProjectListClient({
  projects,
}: {
  projects: Project[];
}) {
  return (
    <div className="min-h-screen bg-white pt-[100px]">
      <section className="py-24 px-6">
        <div className="max-w-[1280px] mx-auto">
          {/* 헤더 */}
          <div className="mb-16">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-3">
              Project
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2f2f2f]">
              시공 사례
            </h1>
          </div>

          {/* 프로젝트 그리드 */}
          {projects.length === 0 ? (
            <p className="text-[14px] text-[#999] text-center py-20">
              등록된 프로젝트가 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/project/${project.id}`}
                  className="group block"
                >
                  {/* 썸네일 */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f5f5]">
                    {project.thumbnail_url ? (
                      <Image
                        src={project.thumbnail_url}
                        alt={project.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[#ccc] text-[12px]">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="mt-4">
                    <h3 className="text-[15px] font-semibold text-[#2f2f2f] group-hover:text-[#555] transition-colors duration-200">
                      {project.name}
                    </h3>
                    {project.address && (
                      <p className="text-[12px] text-[#999] mt-1">
                        {project.address}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
