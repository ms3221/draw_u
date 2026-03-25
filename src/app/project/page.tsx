import type { Metadata } from "next";
import { getPublishedProjects } from "@/lib/dal/projects";
import ProjectListClient from "./ProjectListClient";

export const metadata: Metadata = {
  title: "프로젝트",
  description: "draw_u 인테리어의 시공 사례를 확인하세요.",
  alternates: { canonical: "https://www.draw-u.kr/project" },
};

export default async function ProjectPage() {
  const projects = await getPublishedProjects();

  return <ProjectListClient projects={projects} />;
}
