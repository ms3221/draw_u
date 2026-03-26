import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllProjects } from "@/lib/dal/projects";
import { deleteProjectAction, logoutAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, LogOut, ArrowLeft } from "lucide-react";

export default async function AdminProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const projects = await getAllProjects();

  return (
    <div className="min-h-screen p-6 md:p-10">
      {/* 헤더 */}
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#999] mb-1">
              Admin
            </p>
            <h1 className="text-xl font-bold text-[#2f2f2f]">
              프로젝트 관리
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button
                variant="outline"
                className="rounded-none border-[#d0d0d0] text-[12px] tracking-[0.1em] h-[38px] gap-1.5"
              >
                <ArrowLeft size={14} />
                홈으로
              </Button>
            </Link>
            <Link href="/admin/projects/new">
              <Button className="rounded-none bg-[#2f2f2f] hover:bg-black text-[12px] tracking-[0.1em] h-[38px] gap-1.5">
                <Plus size={14} />
                새 프로젝트
              </Button>
            </Link>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="outline"
                className="rounded-none border-[#d0d0d0] text-[12px] tracking-[0.1em] h-[38px] gap-1.5"
              >
                <LogOut size={14} />
                로그아웃
              </Button>
            </form>
          </div>
        </div>

        {/* 프로젝트 테이블 */}
        {projects.length === 0 ? (
          <p className="text-[14px] text-[#999] text-center py-20">
            등록된 프로젝트가 없습니다.
          </p>
        ) : (
          <div className="bg-white border border-[#e0e0e0]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e0e0e0] text-[11px] tracking-[0.15em] uppercase text-[#999]">
                  <th className="text-left p-4 font-normal">순서</th>
                  <th className="text-left p-4 font-normal">이름</th>
                  <th className="text-left p-4 font-normal hidden md:table-cell">
                    주소
                  </th>
                  <th className="text-left p-4 font-normal">상태</th>
                  <th className="text-right p-4 font-normal">액션</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-[#f0f0f0] last:border-b-0"
                  >
                    <td className="p-4 text-[13px] text-[#999]">
                      {project.sort_order}
                    </td>
                    <td className="p-4 text-[13px] text-[#2f2f2f] font-medium">
                      {project.name}
                    </td>
                    <td className="p-4 text-[13px] text-[#888] hidden md:table-cell">
                      {project.address || "-"}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          project.is_published ? "default" : "secondary"
                        }
                        className="text-[10px] rounded-none"
                      >
                        {project.is_published ? "공개" : "비공개"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/projects/${project.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Pencil size={14} />
                          </Button>
                        </Link>
                        <form
                          action={deleteProjectAction.bind(null, project.id)}
                        >
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
