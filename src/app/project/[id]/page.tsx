import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedProjectById, getPublishedProjects } from "@/lib/dal/projects";
import ProjectDetailClient from "./ProjectDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

// ISR: 1시간마다 재생성. admin 수정 시 revalidatePath(`/project/${id}`) 로 즉시 갱신.
export const revalidate = 3600;

// 빌드 시점에 공개 프로젝트 상세를 미리 생성 → 첫 방문부터 빠르게.
// 빌드 이후 추가된 프로젝트는 첫 요청 시 on-demand 생성 후 캐싱(dynamicParams 기본 true).
export async function generateStaticParams() {
  const projects = await getPublishedProjects();
  return projects.map((p) => ({ id: p.id }));
}

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
