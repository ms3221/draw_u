import type { Metadata } from "next";
import { getPublishedProjects } from "@/lib/dal/projects";
import ProjectListClient from "./ProjectListClient";

export const metadata: Metadata = {
  title: "프로젝트",
  description: "드로우유(DRAWU) 인테리어의 시공 사례를 확인하세요.",
  alternates: { canonical: "https://www.draw-u.kr/project" },
};

// ISR: 1시간마다 재생성. admin 수정 시 revalidatePath("/project") 로 즉시 갱신.
export const revalidate = 3600;

export default async function ProjectPage() {
  const projects = await getPublishedProjects();

  return <ProjectListClient projects={projects} />;
}
