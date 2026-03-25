import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProjectById } from "@/lib/dal/projects";
import ProjectForm from "../../ProjectForm";
import { updateProjectAction } from "../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) notFound();

  const boundAction = updateProjectAction.bind(null, id);

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
          프로젝트 수정
        </h1>

        <ProjectForm project={project} action={boundAction} />
      </div>
    </div>
  );
}
