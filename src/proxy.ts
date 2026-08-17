import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, expectedSessionToken } from "@/features/admin/auth-edge";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const expected = await expectedSessionToken();
  const got = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!expected || got !== expected) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
