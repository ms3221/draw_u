import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProjectForm from "../ProjectForm";
import { createProjectAction } from "../actions";

export default function NewProjectPage() {
  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-[800px] mx-auto">
        <Link
          href="/admin/projects"
          className="inline-flex items-center gap-2 text-[12px] tracking-[0.1em] text-[#999] hover:text-[#2f2f2f] transition-colors duration-200 mb-8"
        >
          <ArrowLeft size={14} />
          목록으로
        </Link>

        <h1 className="text-xl font-bold text-[#2f2f2f] mb-8">
          새 프로젝트 등록
        </h1>

        <ProjectForm action={createProjectAction} />
      </div>
    </div>
  );
}
