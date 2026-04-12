import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedProjectById } from "@/lib/dal/projects";
import ProjectDetailClient from "./ProjectDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = await getPublishedProjectById(id);

  if (!project) {
    return { title: "프로젝트를 찾을 수 없습니다" };
  }

  return {
    title: `${project.name} | 드로우유 인테리어 시공 사례`,
    description: project.description || `드로우유 인테리어 - ${project.name} 시공 사례`,
    alternates: { canonical: `https://www.draw-u.kr/project/${id}` },
    openGraph: {
      title: `${project.name} | 드로우유 인테리어`,
      description: project.description || `드로우유 인테리어 - ${project.name} 시공 사례`,
      url: `https://www.draw-u.kr/project/${id}`,
      images: project.thumbnail_url ? [project.thumbnail_url] : ["/images/og.png"],
    },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = await getPublishedProjectById(id);

  if (!project) {
    notFound();
  }

  return <ProjectDetailClient project={project} />;
}
