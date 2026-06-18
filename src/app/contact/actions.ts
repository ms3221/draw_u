"use server";

import { createClient } from "@/lib/supabase/server";

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID!;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_MENTION = "<@U08U7FD405T>"; // 모든 접수 알림에서 태그할 담당자

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
      // multi_select 옵션 이름엔 쉼표를 쓸 수 없어 쉼표 기준으로 쪼개 여러 태그로 전송
      multi_select: data.availableTime
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name })),
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
 * 새 상담 신청을 Slack 채널로 알림 전송.
 * Webhook URL 미설정 시 조용히 스킵하고, 전송 실패해도 예외를 던지지 않는다.
 */
async function notifySlack(
  data: SubmitToNotionData,
  notion: { success: boolean; notionPageId?: string },
  dbSuccess: boolean
) {
  if (!SLACK_WEBHOOK_URL) return;

  const notionLine =
    notion.success && notion.notionPageId
      ? `*Notion 전송* : ✅ 성공  <https://www.notion.so/${notion.notionPageId.replace(
          /-/g,
          ""
        )}|📄 Notion에서 보기>`
      : "*Notion 전송* : ❌ 실패";

  const dbLine = dbSuccess ? "*DB 저장* : ✅ 성공" : "*DB 저장* : ❌ 실패";

  const allFailed = !notion.success && !dbSuccess;

  const text = [
    SLACK_MENTION,
    `*이름* : ${data.name}`,
    `*전화번호* : ${data.phone}`,
    notionLine,
    dbLine,
    `*사이트* : <https://www.draw-u.kr/admin/inquiries|🖥️ 사이트에서 보기>`,
  ].join("\n");

  const blocks: Array<Record<string, unknown>> = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: allFailed ? "🚨 저장 실패 — 정보 유실 방지 백업" : "📥 사이트 접수신청",
        emoji: true,
      },
    },
    { type: "section", text: { type: "mrkdwn", text } },
  ];

  // 노션·DB 둘 다 실패하면 유저 정보가 어디에도 안 남으므로 전체 입력값을 백업으로 첨부한다.
  if (allFailed) {
    const referralLabel =
      data.referral === "other" && data.referralOther
        ? data.referralOther
        : REFERRAL_MAP[data.referral] || data.referral;

    const backup = [
      `*가족 구성원* : ${data.familyMembers}`,
      `*연락 가능한 시간* : ${data.availableTime}`,
      `*현장 주소* : ${data.address}`,
      `*공사 범위* : ${data.area}`,
      `*공사 시작일* : ${data.startDate}`,
      `*입주 / 영업 희망일* : ${data.moveInDate}`,
      `*공사 예산* : ${data.budget}`,
      `*유입 경로* : ${referralLabel}`,
    ];
    if (data.projectUrl) backup.push(`*관심 프로젝트 URL* : ${data.projectUrl}`);
    if (data.freeText) backup.push(`*문의 사항* : ${data.freeText}`);
    if (data.floorPlanUrls?.length)
      backup.push(`*평면도*\n${data.floorPlanUrls.join("\n")}`);
    if (data.referencePhotoUrls?.length)
      backup.push(`*참고사진*\n${data.referencePhotoUrls.join("\n")}`);

    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `⚠️ *DB·Notion 모두 저장 실패. 아래 전체 정보를 꼭 수동 보관하세요.*\n\n${backup.join(
          "\n"
        )}`,
      },
    });
  }

  // 연속으로 알림이 쌓여도 건마다 구분되도록 맨 아래에 절취선을 둔다.
  blocks.push({ type: "divider" });

  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `사이트 접수신청 - ${data.name} 님`, // 알림 미리보기/폴백 텍스트
      blocks,
    }),
  });

  if (!res.ok) {
    console.error("Slack 전송 실패:", res.status, await res.text());
  }
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

  // DB 저장도 실패가 Slack 알림을 막지 않도록 예외를 삼킨다.
  let dbSuccess = false;
  try {
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
    } else {
      dbSuccess = true;
    }
  } catch (e) {
    console.error("Supabase 저장 예외:", e);
  }

  // Notion/DB 성공 여부와 무관하게 Slack 알림은 반드시 보낸다.
  try {
    await notifySlack(data, notionResult, dbSuccess);
  } catch (e) {
    console.error("Slack 전송 예외:", e);
  }

  return { success: dbSuccess, notionSynced: notionResult.success };
}
