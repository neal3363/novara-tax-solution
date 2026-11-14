import { NextResponse } from "next/server";
import { authenticatePreview, isPreviewAuthConfigured, portalPath } from "@/lib/auth/session";
import { SESSION_COOKIE, encodeSession } from "@/lib/auth/cookies";
import { getAuthSecret } from "@/lib/auth/crypto";
import { appendAuditEvent } from "@/lib/audit/store";

export async function POST(request: Request) {
  if (!getAuthSecret() || !isPreviewAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Preview authentication is not configured. Set AUTH_SECRET and PREVIEW_AUTH_PASSWORD.",
      },
      { status: 503 },
    );
  }

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

  const token = await encodeSession(user);
  const response = NextResponse.json({
    ok: true,
    role: user.role,
    redirectTo: portalPath(user.role),
    mfaEnabled: user.mfaEnabled,
    previewMode: true,
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
