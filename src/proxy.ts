import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, expectedSessionToken } from "@/features/admin/auth-edge";

const USER_COOKIE = "metered_user";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const expected = await expectedSessionToken();
  const adminCookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (expected && adminCookie === expected) {
    return NextResponse.next();
  }
  if (request.cookies.get(USER_COOKIE)?.value) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
