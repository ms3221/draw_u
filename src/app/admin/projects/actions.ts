"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProjectInsert, ProjectUpdate } from "@/lib/supabase/types";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // admin_users 테이블에서 권한 확인
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", user.email)
    .single();

  if (!admin) {
    throw new Error("관리자 권한이 없습니다.");
  }

  return { user, supabase };
}

export async function createProjectAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const project: ProjectInsert = {
    name: formData.get("name") as string,
    address: (formData.get("address") as string) || null,
    description: (formData.get("description") as string) || null,
    details: JSON.parse((formData.get("details") as string) || "{}"),
    thumbnail_url: (formData.get("thumbnail_url") as string) || null,
    images: JSON.parse((formData.get("images") as string) || "[]"),
    is_published: formData.get("is_published") === "true",
    sort_order: Number(formData.get("sort_order") || 0),
  };

  const { error } = await supabase.from("projects").insert(project);

  if (error) throw new Error(error.message);

  revalidatePath("/project");
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

export async function updateProjectAction(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const updates: ProjectUpdate = {
    name: formData.get("name") as string,
    address: (formData.get("address") as string) || null,
    description: (formData.get("description") as string) || null,
    details: JSON.parse((formData.get("details") as string) || "{}"),
    thumbnail_url: (formData.get("thumbnail_url") as string) || null,
    images: JSON.parse((formData.get("images") as string) || "[]"),
    is_published: formData.get("is_published") === "true",
    sort_order: Number(formData.get("sort_order") || 0),
  };

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/project");
  revalidatePath(`/project/${id}`);
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

export async function deleteProjectAction(id: string) {
  const { supabase } = await requireAdmin();

  // Storage에서 프로젝트 이미지 삭제
  const { data: files } = await supabase.storage
    .from("project-images")
    .list(id);

  if (files && files.length > 0) {
    await supabase.storage
      .from("project-images")
      .remove(files.map((f) => `${id}/${f.name}`));
  }

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/project");
  revalidatePath("/admin/projects");
}

export async function uploadImageAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const file = formData.get("file") as File;
  const projectId = formData.get("projectId") as string;

  if (!file) throw new Error("파일이 없습니다.");

  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = projectId
    ? `${projectId}/${fileName}`
    : `temp/${fileName}`;

  const { error } = await supabase.storage
    .from("project-images")
    .upload(filePath, file);

  if (error) throw new Error(error.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("project-images").getPublicUrl(filePath);

  return publicUrl;
}

export async function deleteImageAction(url: string) {
  const { supabase } = await requireAdmin();

  // URL에서 파일 경로 추출
  const match = url.match(/project-images\/(.+)$/);
  if (!match) return;

  await supabase.storage.from("project-images").remove([match[1]]);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
