import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FurnitureStudio from "../FurnitureStudio";
import type {
  FurnitureAsset,
  FurnitureProject,
  FurnitureResult,
  ResultComment,
} from "../studio-shared";

// 이미지 생성은 장당 15~20초 소요 → 서버 함수 타임아웃 상향
export const maxDuration = 120;

export default async function FurnitureStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const [{ data: project }, { data: assets }, { data: results }, { data: comments }] =
    await Promise.all([
      supabase
        .from("furniture_projects")
        .select("id, name, created_by, created_at, base_url, sketch_url")
        .eq("id", id)
        .single(),
      supabase
        .from("furniture_assets")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("furniture_results")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("furniture_result_comments")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: true }),
    ]);

  if (!project) notFound();
  const p = project as FurnitureProject;

  return (
    <FurnitureStudio
      projectId={p.id}
      projectName={p.name}
      baseUrl={p.base_url}
      sketchUrl={p.sketch_url}
      assets={(assets ?? []) as FurnitureAsset[]}
      results={(results ?? []) as FurnitureResult[]}
      comments={(comments ?? []) as ResultComment[]}
    />
  );
}
