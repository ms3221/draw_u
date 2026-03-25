import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // 세션 쿠키 존재 여부만 빠르게 체크 (API 호출 없음)
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  // /admin/* (login 제외) 보호
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin/login") &&
    !hasSession
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // 로그인 상태에서 /admin/login 접근 시 리다이렉트
  if (request.nextUrl.pathname === "/admin/login" && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/projects";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/admin/:path*"],
};
