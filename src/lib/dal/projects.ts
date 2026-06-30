import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Project, ProjectInsert, ProjectUpdate } from "@/lib/supabase/types";

// ── 공개 쿼리 ──
// 쿠키를 쓰지 않는 public 클라이언트로 조회 → 페이지 ISR/정적 캐싱 가능.
// React cache() 로 같은 요청 내 중복 호출(generateMetadata + page)을 1회로 합친다.

export const getPublishedProjects = cache(async (): Promise<Project[]> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
});

export const getPublishedProjectById = cache(
  async (id: string): Promise<Project | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("is_published", true)
      .single();

    if (error) return null;
    return data;
  }
);

// ── 관리자 쿼리 ──

export async function getAllProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function createProject(
  project: ProjectInsert
): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert(project)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  updates: ProjectUpdate
): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) throw error;
}
