"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import {
  STUDIO_BUCKET,
  bucketPathFromUrl,
  type FurnitureAsset,
  type ResultComment,
} from "./studio-shared";

/** 프로젝트 생성 후 해당 스튜디오로 이동 */
export async function createFurnitureProject(formData: FormData) {
  const { user, supabase } = await requireAdmin();

  const name = ((formData.get("name") as string) || "").trim();
  if (!name) {
    throw new Error("프로젝트명을 입력해 주세요.");
  }

  const { data, error } = await supabase
    .from("furniture_projects")
    .insert({ name, created_by: user.email })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("프로젝트 생성에 실패했습니다.");
  }

  revalidatePath("/admin/furniture");
  redirect(`/admin/furniture/${data.id}`);
}

/**
 * 프로젝트 삭제: DB 행들의 url 로 storage 경로를 수집해 일괄 삭제 후 행 삭제.
 * (Supabase storage.list() 는 비재귀라 `{projectId}/` 하위를 한 번에 나열할 수 없음
 *  — DB 가 경로의 원천이므로 DB 수집이 완전하다. 행은 FK cascade 로 함께 삭제.)
 */
export async function deleteFurnitureProject(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = (formData.get("id") as string) || "";
  if (!id) throw new Error("잘못된 요청입니다.");

  const [{ data: project }, { data: assets }, { data: results }] =
    await Promise.all([
      supabase
        .from("furniture_projects")
        .select("base_url, sketch_url")
        .eq("id", id)
        .single(),
      supabase.from("furniture_assets").select("url").eq("project_id", id),
      supabase.from("furniture_results").select("url").eq("project_id", id),
    ]);

  const paths = [
    project?.base_url,
    project?.sketch_url,
    ...(assets ?? []).map((a) => a.url),
    ...(results ?? []).map((r) => r.url),
  ]
    .map(bucketPathFromUrl)
    .filter((p): p is string => !!p);

  if (paths.length > 0) {
    // storage 정리 실패는 프로젝트 삭제를 막지 않는다 (고아 파일은 무해)
    await supabase.storage.from(STUDIO_BUCKET).remove(paths);
  }

  const { error } = await supabase
    .from("furniture_projects")
    .delete()
    .eq("id", id);

  if (error) throw new Error("프로젝트 삭제에 실패했습니다.");

  revalidatePath("/admin/furniture");
}

/** 클라이언트가 storage 에 직접 올린 가구 이미지를 라이브러리(DB)에 등록 */
export async function registerFurnitureAsset(
  projectId: string,
  url: string,
  originalName?: string
): Promise<FurnitureAsset> {
  const { user, supabase } = await requireAdmin();

  if (!projectId || !bucketPathFromUrl(url)) {
    throw new Error("잘못된 요청입니다.");
  }

  const { data, error } = await supabase
    .from("furniture_assets")
    .insert({
      project_id: projectId,
      url,
      original_name: originalName ?? null,
      created_by: user.email,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error("가구 등록에 실패했습니다.");

  revalidatePath(`/admin/furniture/${projectId}`);
  return data as FurnitureAsset;
}

/**
 * 베이스 세트(본사진/스케치) 설정. 전달된 필드만 교체한다.
 * 이전 파일은 삭제하지 않는다 — 기존 결과의 input_refs 가 참조 중일 수 있음 (이력 불변성).
 */
export async function setProjectBase(
  projectId: string,
  updates: { baseUrl?: string | null; sketchUrl?: string | null }
) {
  const { supabase } = await requireAdmin();

  const patch: Record<string, string | null> = {};
  if (updates.baseUrl !== undefined) patch.base_url = updates.baseUrl;
  if (updates.sketchUrl !== undefined) patch.sketch_url = updates.sketchUrl;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from("furniture_projects")
    .update(patch)
    .eq("id", projectId);

  if (error) throw new Error("베이스 이미지 설정에 실패했습니다.");

  revalidatePath(`/admin/furniture/${projectId}`);
}

/** 가구 삭제: DB 행만 삭제. storage 파일은 결과 이력(input_refs)이 참조하므로 유지 */
export async function deleteFurnitureAsset(id: string, projectId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("furniture_assets")
    .delete()
    .eq("id", id);

  if (error) throw new Error("가구 삭제에 실패했습니다.");

  revalidatePath(`/admin/furniture/${projectId}`);
}

/** 결과에 요청사항(댓글) 추가 */
export async function addResultComment(
  projectId: string,
  resultId: string,
  body: string
): Promise<ResultComment> {
  const { user, supabase } = await requireAdmin();

  const text = body.trim();
  if (!text) throw new Error("요청사항을 입력해 주세요.");

  const { data, error } = await supabase
    .from("furniture_result_comments")
    .insert({
      project_id: projectId,
      result_id: resultId,
      body: text,
      created_by: user.email,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error("요청사항 등록에 실패했습니다.");

  revalidatePath(`/admin/furniture/${projectId}`);
  return data as ResultComment;
}

/** 요청사항(댓글) 삭제 */
export async function deleteResultComment(id: string, projectId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("furniture_result_comments")
    .delete()
    .eq("id", id);

  if (error) throw new Error("요청사항 삭제에 실패했습니다.");

  revalidatePath(`/admin/furniture/${projectId}`);
}

/** 결과 삭제: DB 행만 삭제. 편집 체인(edit_base 참조)이 깨지지 않도록 storage 파일 유지 */
export async function deleteFurnitureResult(id: string, projectId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("furniture_results")
    .delete()
    .eq("id", id);

  if (error) throw new Error("결과 삭제에 실패했습니다.");

  revalidatePath(`/admin/furniture/${projectId}`);
}
