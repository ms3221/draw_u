import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderOpen, Plus } from "lucide-react";
import { createFurnitureProject } from "./projects-actions";
import type { FurnitureProject } from "./studio-shared";
import DeleteProjectButton from "./DeleteProjectButton";

export default async function FurnitureProjectListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: projects } = await supabase
    .from("furniture_projects")
    .select("id, name, created_by, created_at, base_url, sketch_url")
    .order("created_at", { ascending: false });

  const list = (projects ?? []) as FurnitureProject[];

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-[900px] mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-1">
              Admin · Beta
            </p>
            <h1 className="text-xl font-bold text-[#2f2f2f]">
              AI 가구 배치 — 프로젝트
            </h1>
          </div>
          <Link href="/admin">
            <Button
              variant="outline"
              className="rounded-none border-[#d0d0d0] text-[12px] tracking-[0.1em] h-[38px] gap-1.5"
            >
              <ArrowLeft size={14} />
              홈으로
            </Button>
          </Link>
        </div>

        {/* 새 프로젝트 생성 */}
        <div className="bg-white border border-[#e0e0e0] p-4 mb-8">
          <p className="text-[11px] tracking-[0.15em] uppercase text-[#999] mb-3">
            새 프로젝트
          </p>
          <form action={createFurnitureProject} className="flex gap-2">
            <input
              name="name"
              required
              placeholder="프로젝트명 (예: 성수동 34평 거실)"
              className="flex-1 border border-[#e0e0e0] px-3 h-[42px] text-[13px] focus:outline-none focus:border-[#2f2f2f]"
            />
            <Button
              type="submit"
              className="rounded-none bg-[#2f2f2f] hover:bg-black text-[13px] tracking-[0.1em] h-[42px] gap-1.5 px-5"
            >
              <Plus size={15} />
              만들고 시작
            </Button>
          </form>
          <p className="text-[11px] text-[#aaa] mt-2">
            생성하면 바로 해당 프로젝트의 스튜디오로 이동합니다. 이후 생성
            결과는 프로젝트 단위로 관리됩니다.
          </p>
        </div>

        {/* 프로젝트 리스트 */}
        <p className="text-[13px] font-semibold text-[#2f2f2f] mb-4">
          프로젝트 {list.length > 0 && `(${list.length})`}
        </p>

        {list.length === 0 ? (
          <div className="border border-dashed border-[#e0e0e0] py-24 flex flex-col items-center justify-center text-[#bbb]">
            <FolderOpen size={36} className="mb-3" strokeWidth={1} />
            <p className="text-[13px]">
              아직 프로젝트가 없습니다. 위에서 첫 프로젝트를 만들어 보세요.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#e0e0e0]">
            {list.map((p) => (
              <div
                key={p.id}
                className="flex items-center border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafa] transition-colors"
              >
                <Link
                  href={`/admin/furniture/${p.id}`}
                  className="flex-1 flex items-center justify-between gap-4 p-4 min-w-0"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#2f2f2f] truncate">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-[#999] mt-0.5">
                      {p.created_by} ·{" "}
                      {new Date(p.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <span className="text-[12px] text-[#999] shrink-0">
                    열기 →
                  </span>
                </Link>
                <div className="pr-3 shrink-0">
                  <DeleteProjectButton id={p.id} name={p.name} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
