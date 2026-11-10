import { createAdminClient } from "@/lib/supabase/admin";
import {
  NO_STORE,
  PARTNER_INQUIRY_COLUMNS,
  checkPartnerAuth,
  parseCursor,
  toPartnerInquiry,
} from "@/lib/partner-api";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * GET /api/inquiries — 파트너용 문의 목록
 *
 * Query
 * - limit  : 1~100 (기본 50)
 * - since  : ISO 시각. 이 시각 "이후" 문의를 오래된 순으로 (동기화/누락 보충용)
 * - before : ISO 시각. 이 시각 "이전" 문의를 최신 순으로 (과거 페이지 넘김용)
 *
 * Response: { data: PartnerInquiry[], nextCursor: string | null }
 *  - since 모드면 nextCursor 를 다음 since 로, before 모드면 다음 before 로 넘기면 된다.
 */
export async function GET(request: Request) {
  const unauthorized = checkPartnerAuth(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const since = parseCursor(searchParams.get("since"));
  const before = parseCursor(searchParams.get("before"));

  if (since !== undefined && before !== undefined) {
    return Response.json(
      { error: "since 와 before 는 동시에 쓸 수 없습니다." },
      { status: 400 }
    );
  }
  for (const [k, v] of [["since", since], ["before", before]] as const) {
    if (v === null) {
      return Response.json(
        { error: `${k} 는 ISO 8601 시각이어야 합니다.` },
        { status: 400 }
      );
    }
  }

  const rawLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  let query = createAdminClient()
    .from("contact_inquiries")
    .select(PARTNER_INQUIRY_COLUMNS);

  if (since) {
    query = query
      .gt("created_at", since)
      .order("created_at", { ascending: true });
  } else {
    if (before) query = query.lt("created_at", before);
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error("파트너 API 목록 조회 실패:", error);
    return Response.json(
      { error: "조회 실패" },
      { status: 500, headers: NO_STORE }
    );
  }

  const items = (data ?? []).map(toPartnerInquiry);
  const nextCursor =
    items.length === limit ? items[items.length - 1].createdAt : null;

  return Response.json({ data: items, nextCursor }, { headers: NO_STORE });
}
