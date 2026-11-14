import { NextResponse } from "next/server";
import { authenticatePassword, isAuthConfigured, portalPath } from "@/lib/auth/session";
import {
  PENDING_MFA_COOKIE,
  SESSION_COOKIE,
  clearAuthCookies,
  encodeSession,
} from "@/lib/auth/cookies";
import { authRosterFingerprint } from "@/lib/auth/users";
import { appendAuditEvent } from "@/lib/audit/store";
import {
  checkLoginRateLimit,
  registerLoginFailure,
  registerLoginSuccess,
} from "@/lib/auth/rate-limit";

function clientKey(request: Request, email: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || "local";
  return `${ip}:${email.trim().toLowerCase()}`;
}

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Authentication is not configured. Set AUTH_SECRET, AUTH_MODE, and AUTH_USERS_JSON or OIDC variables.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email ?? "";
  const password = body.password ?? "";
  const key = clientKey(request, email || "unknown");

  const precheck = checkLoginRateLimit(key);
  if (!precheck.allowed) {
    appendAuditEvent({
      actor: email || "unknown",
      action: "login_rate_limited",
      resource: "auth",
      outcome: "denied",
    });
    return NextResponse.json(
      { error: "Too many login attempts. Try again later.", retryAfterSeconds: precheck.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(precheck.retryAfterSeconds) } },
    );
  }

  const result = authenticatePassword(email, password);
  if (!result) {
    const limited = registerLoginFailure(key);
    appendAuditEvent({
      actor: email || "unknown",
      action: "login_attempt",
      resource: "auth",
      outcome: "denied",
    });
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later.", retryAfterSeconds: limited.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      );
    }
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  registerLoginSuccess(key);
  const rosterFp = authRosterFingerprint();
  const response = NextResponse.json({
    ok: true,
    mfaRequired: result.mfaRequired,
    role: result.session.role,
    redirectTo: result.mfaRequired ? "/login/mfa" : portalPath(result.session.role),
  });

  clearAuthCookies(response);

  if (result.mfaRequired) {
    const pending = await encodeSession({
      role: result.session.role,
      userId: result.session.id,
      organizationId: result.session.organizationId,
      mfaVerified: false,
      authSource: "password",
      rosterFp,
      ttlSeconds: 10 * 60,
    });
    response.cookies.set(PENDING_MFA_COOKIE, pending, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });
    appendAuditEvent({
      actor: result.session.id,
      action: "login_password_ok_mfa_pending",
      resource: `portal:${result.session.role}`,
      outcome: "allowed",
    });
    return response;
  }

  const token = await encodeSession({
    role: result.session.role,
    userId: result.session.id,
    organizationId: result.session.organizationId,
    mfaVerified: true,
    authSource: "password",
    rosterFp,
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  appendAuditEvent({
    actor: result.session.id,
    action: "login_success",
    resource: `portal:${result.session.role}`,
    outcome: "allowed",
  });
  return response;
}
