import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  PENDING_MFA_COOKIE,
  SESSION_COOKIE,
  clearAuthCookies,
  decodeSession,
  encodeSession,
} from "@/lib/auth/cookies";
import { findAuthUserById, roleRequiresMfa } from "@/lib/auth/users";
import { verifyTotpCode } from "@/lib/auth/totp";
import { portalPath } from "@/lib/auth/session";
import { appendAuditEvent } from "@/lib/audit/store";
import { authRosterFingerprint } from "@/lib/auth/users";

export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string };
  const jar = await cookies();
  const pending = await decodeSession(jar.get(PENDING_MFA_COOKIE)?.value);

  if (!pending || pending.mfaVerified) {
    return NextResponse.json({ error: "MFA challenge not found or expired" }, { status: 401 });
  }

  const user = findAuthUserById(pending.userId);
  if (!user || user.role !== pending.role || user.organizationId !== pending.organizationId) {
    return NextResponse.json({ error: "MFA challenge invalid" }, { status: 401 });
  }

  if (!roleRequiresMfa(user)) {
    return NextResponse.json({ error: "MFA not required for this account" }, { status: 400 });
  }

  const ok = verifyTotpCode(user.totpSecret, body.code ?? "");
  if (!ok) {
    appendAuditEvent({
      actor: user.id,
      action: "mfa_failed",
      resource: `portal:${user.role}`,
      outcome: "denied",
    });
    return NextResponse.json({ error: "Invalid MFA code" }, { status: 401 });
  }

  const token = await encodeSession({
    role: user.role,
    userId: user.id,
    organizationId: user.organizationId,
    mfaVerified: true,
    authSource: pending.authSource,
    rosterFp: authRosterFingerprint(),
  });

  const response = NextResponse.json({
    ok: true,
    redirectTo: portalPath(user.role),
  });
  clearAuthCookies(response);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  appendAuditEvent({
    actor: user.id,
    action: "mfa_verified",
    resource: `portal:${user.role}`,
    outcome: "allowed",
  });
  return response;
}
