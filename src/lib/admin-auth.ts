import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 관리자 인증 확인. 미로그인 시 /admin/login 으로 리다이렉트,
 * admin_users 에 없으면 에러를 던진다.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

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
