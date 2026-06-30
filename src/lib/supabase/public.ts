import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * 쿠키를 사용하지 않는 공개 읽기 전용 Supabase 클라이언트.
 *
 * 서버 컴포넌트에서 cookies() 를 호출하면 해당 라우트가 강제로 동적 렌더링되어
 * ISR/정적 캐싱이 무력화된다. 인증이 필요 없는 공개 페이지(프로젝트 목록/상세)는
 * 이 클라이언트를 사용해 cookies() 호출을 피하고 캐싱이 가능하도록 한다.
 *
 * anon key + RLS 로 is_published = true 행만 읽으므로 권한 문제는 없다.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
