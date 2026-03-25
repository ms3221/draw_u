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
    title: project.name,
    description: project.description || `${project.name} 시공 사례`,
    openGraph: {
      title: project.name,
      description: project.description || `${project.name} 시공 사례`,
      images: project.thumbnail_url ? [project.thumbnail_url] : [],
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
