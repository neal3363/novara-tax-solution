import { NextResponse } from "next/server";
import { authenticatePreview, portalPath } from "@/lib/auth/session";
import { SESSION_COOKIE, encodeSession } from "@/lib/auth/cookies";
import { appendAuditEvent } from "@/lib/audit/store";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const user = authenticatePreview(body.email ?? "", body.password ?? "");

  if (!user) {
    appendAuditEvent({
      actor: body.email ?? "unknown",
      action: "login_attempt",
      resource: "auth",
      outcome: "denied",
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  appendAuditEvent({
    actor: user.id,
    action: "login_success",
    resource: `portal:${user.role}`,
    outcome: "allowed",
  });

  const response = NextResponse.json({
    ok: true,
    role: user.role,
    redirectTo: portalPath(user.role),
    mfaEnabled: user.mfaEnabled,
    previewMode: true,
  });

  response.cookies.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
