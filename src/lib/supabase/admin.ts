import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * service_role 키로 RLS 를 우회하는 서버 전용 클라이언트.
 *
 * 외부 파트너 API(/api/inquiries)처럼 로그인 세션 없이 문의를 읽어야 하는 곳에서만 쓴다.
 * 절대 클라이언트 번들/NEXT_PUBLIC_ 변수로 노출하지 말 것.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다.");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
