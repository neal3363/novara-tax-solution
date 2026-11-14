import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decodeSession, portalFromPath } from "@/lib/auth/cookies";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = decodeSession(token);
  const requiredPortal = portalFromPath(pathname);

  if (!session || !requiredPortal) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (session.role !== requiredPortal) {
    const denied = new URL("/login", request.url);
    denied.searchParams.set("error", "portal_isolation");
    denied.searchParams.set("attempted", pathname);
    return NextResponse.redirect(denied);
  }

  if (!session.mfaVerified) {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "mfa_required");
    return NextResponse.redirect(login);
  }

  const response = NextResponse.next();
  response.headers.set("x-novara-role", session.role);
  response.headers.set("x-novara-org", session.organizationId);
  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};
