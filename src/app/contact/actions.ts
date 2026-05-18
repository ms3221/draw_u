"use server";

import { createClient } from "@/lib/supabase/server";

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID!;

const REFERRAL_MAP: Record<string, string> = {
  instagram: "인스타그램",
  blog: "블로그",
  referral: "지인소개",
  other: "기타",
};

type SubmitToNotionData = {
  name: string;
  phone: string;
  familyMembers: string;
  availableTime: string;
  address: string;
  area: string;
  startDate: string;
  moveInDate: string;
  budget: string;
  referral: string;
  referralOther?: string;
  floorPlanUrls?: string[];
  referencePhotoUrls?: string[];
  projectUrl?: string;
  freeText?: string;
};

export async function submitToNotion(
  data: SubmitToNotionData,
  submittedAt?: string
) {
  const referralLabel =
    data.referral === "other" && data.referralOther
      ? data.referralOther
      : REFERRAL_MAP[data.referral] || data.referral;

  const properties: Record<string, unknown> = {
    "프로젝트 이름": { title: [{ text: { content: `${data.name} 님` } }] },
    이름: { rich_text: [{ text: { content: data.name } }] },
    연락처: { rich_text: [{ text: { content: data.phone } }] },
    "가족 구성원": { rich_text: [{ text: { content: data.familyMembers } }] },
    "연락 가능한 시간": {
      multi_select: [{ name: data.availableTime }],
    },
    "현장 주소": { rich_text: [{ text: { content: data.address } }] },
    "공사 범위": { rich_text: [{ text: { content: data.area } }] },
    "공사 예산": { rich_text: [{ text: { content: data.budget } }] },
    "공사 시작일": { date: { start: data.startDate } },
    "입주 / 영업 희망일": { date: { start: data.moveInDate } },
    "문의 사항": {
      rich_text: [{ text: { content: data.freeText || "" } }],
    },
    "유입 경로": { select: { name: referralLabel } },
    "상담 신청일": { date: { start: submittedAt || getKSTDate() } },
    "관심 프로젝트 URL": { url: data.projectUrl || null },
  };

  if (data.floorPlanUrls?.length) {
    properties["평면도"] = {
      files: data.floorPlanUrls.map((url, i) => ({
        name: `평면도_${i + 1}`,
        type: "external",
        external: { url },
      })),
    };
  }

  if (data.referencePhotoUrls?.length) {
    properties["참고사진"] = {
      files: data.referencePhotoUrls.map((url, i) => ({
        name: `참고사진_${i + 1}`,
        type: "external",
        external: { url },
      })),
    };
  }

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DATABASE_ID },
      properties,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error("Notion API error:", error);
    return { success: false as const, error: "Notion 전송 실패" };
  }

  const created = (await res.json()) as { id?: string };
  return { success: true as const, notionPageId: created.id };
}

function getKSTDate(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

/**
 * 상담 신청 저장 + Notion 전송을 서버에서 단일 처리.
 * Notion 결과를 같은 insert 에 기록하므로 별도 anon UPDATE 가 필요 없다.
 * 파일은 클라이언트에서 업로드 후 URL 만 전달한다.
 */
export async function submitInquiry(data: SubmitToNotionData) {
  // Notion 전송이 예외를 던져도 DB 백업은 반드시 남긴다.
  let notionResult: { success: boolean; notionPageId?: string };
  try {
    notionResult = await submitToNotion(data);
  } catch (e) {
    console.error("Notion 전송 예외:", e);
    notionResult = { success: false };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("contact_inquiries").insert({
    name: data.name,
    phone: data.phone,
    family_members: data.familyMembers,
    available_time: data.availableTime,
    address: data.address,
    area: data.area,
    start_date: data.startDate,
    move_in_date: data.moveInDate,
    budget: data.budget,
    referral: data.referral,
    referral_other: data.referralOther || null,
    floor_plan_urls: data.floorPlanUrls?.length ? data.floorPlanUrls : null,
    reference_photo_urls: data.referencePhotoUrls?.length
      ? data.referencePhotoUrls
      : null,
    project_url: data.projectUrl || null,
    free_text: data.freeText || null,
    notion_synced: notionResult.success,
    notion_page_id: notionResult.success
      ? notionResult.notionPageId ?? null
      : null,
    notion_synced_at: notionResult.success ? new Date().toISOString() : null,
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return { success: false, notionSynced: notionResult.success };
  }

  return { success: true, notionSynced: notionResult.success };
}
