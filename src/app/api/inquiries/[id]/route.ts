import { createAdminClient } from "@/lib/supabase/admin";
import {
  NO_STORE,
  PARTNER_INQUIRY_COLUMNS,
  checkPartnerAuth,
  toPartnerInquiry,
} from "@/lib/partner-api";

// id 는 DB 자동증가 숫자
const ID_RE = /^[1-9]\d{0,15}$/;

/** GET /api/inquiries/:id — 파트너용 문의 단건 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/inquiries/[id]">
) {
  const unauthorized = checkPartnerAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await ctx.params;
  if (!ID_RE.test(id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await createAdminClient()
    .from("contact_inquiries")
    .select(PARTNER_INQUIRY_COLUMNS)
    .eq("id", Number(id))
    .maybeSingle();

  if (error) {
    console.error("파트너 API 단건 조회 실패:", error);
    return Response.json(
      { error: "조회 실패" },
      { status: 500, headers: NO_STORE }
    );
  }
  if (!data) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ data: toPartnerInquiry(data) }, { headers: NO_STORE });
}
