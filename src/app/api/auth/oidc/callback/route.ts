import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeAuthorizationCode,
  fetchOidcDiscovery,
  getOidcConfig,
  oidcAssertsMfa,
  verifyIdToken,
} from "@/lib/auth/oidc";
import { isOidcConfigured, portalPath } from "@/lib/auth/session";
import { findAuthUserByEmail, authRosterFingerprint, toUserSession } from "@/lib/auth/users";
import {
  SESSION_COOKIE,
  clearAuthCookies,
  encodeSession,
} from "@/lib/auth/cookies";
import { appendAuditEvent } from "@/lib/audit/store";

export async function GET(request: Request) {
  if (!isOidcConfigured()) {
    return NextResponse.json({ error: "OIDC is not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=oidc_${error}`, request.url));
  }
  if (!code || !state) {
    return NextResponse.json({ error: "Missing OIDC code/state" }, { status: 400 });
  }

  const jar = await cookies();
  const expectedState = jar.get("novara_oidc_state")?.value;
  const expectedNonce = jar.get("novara_oidc_nonce")?.value;
  const codeVerifier = jar.get("novara_oidc_verifier")?.value;

  if (!expectedState || !expectedNonce || !codeVerifier || state !== expectedState) {
    await appendAuditEvent({
      actor: "oidc",
      action: "oidc_state_invalid",
      resource: "auth",
      outcome: "denied",
    });
    return NextResponse.redirect(new URL("/login?error=oidc_state", request.url));
  }

  try {
    const config = getOidcConfig()!;
    const discovery = await fetchOidcDiscovery(config.issuer);
    const tokens = await exchangeAuthorizationCode({
      config,
      discovery,
      code,
      codeVerifier,
    });
    const claims = await verifyIdToken({
      config,
      discovery,
      idToken: tokens.id_token,
      expectedNonce,
    });

    if (!oidcAssertsMfa(claims as Record<string, unknown>)) {
      await appendAuditEvent({
        actor: String(claims.email ?? claims.sub ?? "oidc"),
        action: "oidc_mfa_missing",
        resource: "auth",
        outcome: "denied",
      });
      return NextResponse.redirect(new URL("/login?error=oidc_mfa_required", request.url));
    }

    const email = String(claims.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.redirect(new URL("/login?error=oidc_email", request.url));
    }

    const record = findAuthUserByEmail(email);
    if (!record) {
      await appendAuditEvent({
        actor: email,
        action: "oidc_user_not_provisioned",
        resource: "auth",
        outcome: "denied",
      });
      return NextResponse.redirect(new URL("/login?error=oidc_not_provisioned", request.url));
    }

    const sessionUser = toUserSession(record);
    const token = await encodeSession({
      role: sessionUser.role,
      userId: sessionUser.id,
      organizationId: sessionUser.organizationId,
      mfaVerified: true,
      authSource: "oidc",
      rosterFp: authRosterFingerprint(),
    });

    const response = NextResponse.redirect(new URL(portalPath(sessionUser.role), request.url));
    clearAuthCookies(response);
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    response.cookies.set("novara_oidc_state", "", { path: "/", maxAge: 0 });
    response.cookies.set("novara_oidc_nonce", "", { path: "/", maxAge: 0 });
    response.cookies.set("novara_oidc_verifier", "", { path: "/", maxAge: 0 });

    await appendAuditEvent({
      actor: sessionUser.id,
      action: "oidc_login_success",
      resource: `portal:${sessionUser.role}`,
      outcome: "allowed",
    });
    return response;
  } catch (err) {
    await appendAuditEvent({
      actor: "oidc",
      action: "oidc_callback_failed",
      resource: "auth",
      outcome: "denied",
    });
    const detail = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(
      new URL(`/login?error=oidc_failed&detail=${encodeURIComponent(detail.slice(0, 80))}`, request.url),
    );
  }
}
