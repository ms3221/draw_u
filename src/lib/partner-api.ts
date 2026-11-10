import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContactInquiry } from "@/lib/supabase/types";

/** 외부에 노출하는 문의 컬럼 (Notion 내부 상태값 등은 제외) */
export const PARTNER_INQUIRY_COLUMNS =
  "id, name, phone, family_members, available_time, address, area, start_date, move_in_date, budget, referral, referral_other, floor_plan_urls, reference_photo_urls, project_url, free_text, created_at";

export type PartnerInquiry = {
  /** DB 자동증가 숫자 id */
  id: number;
  name: string;
  phone: string;
  familyMembers: string | null;
  availableTime: string | null;
  address: string | null;
  area: string | null;
  startDate: string | null;
  moveInDate: string | null;
  budget: string | null;
  referral: string | null;
  referralOther: string | null;
  floorPlanUrls: string[];
  referencePhotoUrls: string[];
  projectUrl: string | null;
  freeText: string | null;
  createdAt: string;
};

type InquiryRow = Omit<
  ContactInquiry,
  "id" | "notion_synced" | "notion_page_id" | "notion_synced_at"
> & { id: number | string };

export function toPartnerInquiry(row: InquiryRow): PartnerInquiry {
  return {
    id: Number(row.id),
    name: row.name,
    phone: row.phone,
    familyMembers: row.family_members,
    availableTime: row.available_time,
    address: row.address,
    area: row.area,
    startDate: row.start_date,
    moveInDate: row.move_in_date,
    budget: row.budget,
    referral: row.referral,
    referralOther: row.referral_other,
    floorPlanUrls: row.floor_plan_urls ?? [],
    referencePhotoUrls: row.reference_photo_urls ?? [],
    projectUrl: row.project_url,
    freeText: row.free_text,
    createdAt: row.created_at,
  };
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * `Authorization: Bearer <PARTNER_API_KEY>` 검증.
 * 실패 시 바로 반환할 Response, 성공 시 null.
 */
export function checkPartnerAuth(request: Request): Response | null {
  const expected = process.env.PARTNER_API_KEY;
  if (!expected) {
    console.error("PARTNER_API_KEY 미설정 — 파트너 API 비활성");
    return Response.json({ error: "API disabled" }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token || !safeEqual(token, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** 개인정보 응답이 프록시/CDN 에 캐시되지 않도록 */
export const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * 새 문의를 파트너 Webhook 으로 전송.
 * - URL 미설정 시 스킵, 실패해도 예외를 던지지 않는다 (문의 접수를 막으면 안 됨).
 * - 수신 측 검증용: X-DrawU-Signature = "sha256=" + HMAC_SHA256(secret, `${timestamp}.${body}`)
 */
export async function sendPartnerWebhook(inquiry: PartnerInquiry) {
  const url = process.env.PARTNER_WEBHOOK_URL;
  const secret = process.env.PARTNER_WEBHOOK_SECRET;
  if (!url) return;
  if (!secret) {
    console.error("PARTNER_WEBHOOK_SECRET 미설정 — Webhook 전송 스킵");
    return;
  }

  const body = JSON.stringify({ event: "inquiry.created", data: inquiry });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DrawU-Event": "inquiry.created",
        "X-DrawU-Timestamp": timestamp,
        "X-DrawU-Signature": `sha256=${signature}`,
      },
      body,
      // 상대 서버가 느려도 문의 접수 응답이 늘어지지 않게
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error("파트너 Webhook 실패:", res.status, await res.text());
    }
  } catch (e) {
    console.error("파트너 Webhook 예외:", e);
  }
}

/**
 * 커서(ISO 시각) 쿼리값 정규화.
 * - URL 에 `+00:00` 을 인코딩 없이 넣으면 `+` 가 공백으로 바뀌므로 되돌린다.
 * - 마이크로초 정밀도를 잃지 않도록 Date 로 변환하지 않고 원문 그대로 DB 에 넘긴다.
 *   (밀리초로 자르면 since 조회에서 마지막 행이 계속 다시 나와 limit=1 일 때 무한 반복된다)
 * 유효하지 않으면 null.
 */
export function parseCursor(raw: string | null): string | null | undefined {
  if (raw === null) return undefined;
  const v = raw.trim().replace(/ (\d{2}:?\d{2})$/, "+$1");
  return Number.isNaN(Date.parse(v)) ? null : v;
}

/**
 * DB 저장 직후 호출: 방금 넣은 행을 (created_at, phone) 으로 찾아 Webhook 전송.
 * Webhook 미설정이면 DB 조회도 하지 않는다.
 */
export async function notifyPartner(createdAt: string, phone: string) {
  if (!process.env.PARTNER_WEBHOOK_URL) return;

  const { data, error } = await createAdminClient()
    .from("contact_inquiries")
    .select(PARTNER_INQUIRY_COLUMNS)
    .eq("created_at", createdAt)
    .eq("phone", phone)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error("파트너 Webhook: 방금 저장한 문의를 찾지 못함", error);
    return;
  }
  await sendPartnerWebhook(toPartnerInquiry(data));
}
