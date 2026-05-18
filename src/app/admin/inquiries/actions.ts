"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { submitToNotion } from "@/app/contact/actions";
import type { ContactInquiry } from "@/lib/supabase/types";

/** ISO 타임스탬프 → KST 기준 YYYY-MM-DD */
function toKSTDateString(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

/**
 * 미전송(또는 실패) 문의를 Notion 으로 재전송.
 * 상담 신청일은 원본 created_at(KST) 기준으로 기록한다.
 */
export async function resendToNotion(id: string) {
  const { supabase } = await requireAdmin();

  const { data: row, error: fetchError } = await supabase
    .from("contact_inquiries")
    .select("*")
    .eq("id", id)
    .single<ContactInquiry>();

  if (fetchError || !row) {
    return { success: false as const, message: "문의를 찾을 수 없습니다." };
  }

  const notionResult = await submitToNotion(
    {
      name: row.name,
      phone: row.phone,
      familyMembers: row.family_members ?? "",
      availableTime: row.available_time ?? "",
      address: row.address ?? "",
      area: row.area ?? "",
      startDate: row.start_date ?? "",
      moveInDate: row.move_in_date ?? "",
      budget: row.budget ?? "",
      referral: row.referral ?? "",
      referralOther: row.referral_other ?? undefined,
      floorPlanUrls: row.floor_plan_urls ?? undefined,
      referencePhotoUrls: row.reference_photo_urls ?? undefined,
      projectUrl: row.project_url ?? undefined,
      freeText: row.free_text ?? undefined,
    },
    toKSTDateString(row.created_at)
  );

  if (!notionResult.success) {
    return { success: false as const, message: "Notion 전송에 실패했습니다." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("contact_inquiries")
    .update({
      notion_synced: true,
      notion_page_id: notionResult.notionPageId ?? null,
      notion_synced_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");

  if (updateError) {
    // 실제 Postgres 에러를 그대로 노출 (컬럼 없음 / 제약 위반 등 진단용)
    console.error("contact_inquiries UPDATE error:", updateError);
    return {
      success: false as const,
      message: `Notion 전송은 성공했으나 상태 저장 실패: ${updateError.message}`,
    };
  }

  if (!updated || updated.length === 0) {
    // 에러는 없지만 0건 갱신 = RLS UPDATE 정책이 행을 막는 경우
    return {
      success: false as const,
      message:
        "Notion 전송은 성공했으나 상태가 저장되지 않았습니다. (관리자 UPDATE RLS 정책 누락 — 마이그레이션 SQL 실행 필요)",
    };
  }

  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${id}`);

  return { success: true as const, message: "Notion 으로 전송했습니다." };
}

/**
 * 문의 삭제. contact 버킷의 평면도/참고사진 파일도 함께 정리한다.
 */
export async function deleteInquiry(id: string) {
  const { supabase } = await requireAdmin();

  const { data: row } = await supabase
    .from("contact_inquiries")
    .select("floor_plan_urls, reference_photo_urls")
    .eq("id", id)
    .single<Pick<ContactInquiry, "floor_plan_urls" | "reference_photo_urls">>();

  // 스토리지 파일 경로 추출 (.../object/public/contact/<path>)
  const urls = [
    ...(row?.floor_plan_urls ?? []),
    ...(row?.reference_photo_urls ?? []),
  ];
  const paths = urls
    .map((u) => u.match(/\/contact\/(.+)$/)?.[1])
    .filter((p): p is string => Boolean(p));

  if (paths.length > 0) {
    await supabase.storage.from("contact").remove(paths);
  }

  const { error } = await supabase
    .from("contact_inquiries")
    .delete()
    .eq("id", id);

  if (error) {
    return {
      success: false as const,
      message: "삭제에 실패했습니다. (RLS DELETE 정책 확인 필요)",
    };
  }

  revalidatePath("/admin/inquiries");
  return { success: true as const, message: "문의를 삭제했습니다." };
}
