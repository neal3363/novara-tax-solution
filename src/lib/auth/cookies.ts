import type { PortalRole } from "@/lib/types";
import { getAuthSecret, signPayload, verifySignedPayload } from "@/lib/auth/crypto";

/** v2 cookie invalidates all shared-password / unsigned preview sessions. */
export const SESSION_COOKIE = "novara_ai_session_v2";
export const PENDING_MFA_COOKIE = "novara_ai_mfa_pending";
export const LEGACY_SESSION_COOKIES = ["novara_ai_session"] as const;

export type SessionPayload = {
  v: 2;
  role: PortalRole;
  userId: string;
  organizationId: string;
  /** Only true after provider/TOTP MFA success for MFA-required users. */
  mfaVerified: boolean;
  authSource: "password" | "oidc";
  sessionVersion: string;
  rosterFp: string;
  issuedAt: string;
  exp: number;
};

function encodeBase64UrlJson(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64UrlJson<T>(value: string): T | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (padded.length % 4)) % 4;
    const normalized = padded + "=".repeat(padLength);
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

export function getSessionVersion(): string {
  return process.env.AUTH_SESSION_VERSION?.trim() || "2";
}

export async function encodeSession(payloadInput: {
  role: PortalRole;
  userId: string;
  organizationId: string;
  mfaVerified: boolean;
  authSource: "password" | "oidc";
  rosterFp: string;
  ttlSeconds?: number;
}): Promise<string> {
  const secret = getAuthSecret();
  if (!secret) throw new Error("AUTH_SECRET is not configured");

  const ttl = payloadInput.ttlSeconds ?? 60 * 60 * 8;
  const payload: SessionPayload = {
    v: 2,
    role: payloadInput.role,
    userId: payloadInput.userId,
    organizationId: payloadInput.organizationId,
    mfaVerified: payloadInput.mfaVerified,
    authSource: payloadInput.authSource,
    sessionVersion: getSessionVersion(),
    rosterFp: payloadInput.rosterFp,
    issuedAt: new Date().toISOString(),
    exp: Math.floor(Date.now() / 1000) + ttl,
  };

  return signPayload(encodeBase64UrlJson(payload), secret);
}

export async function decodeSession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const secret = getAuthSecret();
  if (!secret) return null;

  const payloadPart = await verifySignedPayload(token, secret);
  if (!payloadPart) return null;

  const parsed = decodeBase64UrlJson<SessionPayload>(payloadPart);
  if (!parsed || parsed.v !== 2) return null;
  if (!parsed.role || !parsed.userId || !parsed.organizationId) return null;
  if (parsed.sessionVersion !== getSessionVersion()) return null;
  if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

export function portalFromPath(pathname: string): PortalRole | null {
  if (pathname.startsWith("/app/executive")) return "executive";
  if (pathname.startsWith("/app/partner")) return "partner";
  if (pathname.startsWith("/app/attorney")) return "attorney";
  if (pathname.startsWith("/app/owner")) return "owner";
  return null;
}

export function clearAuthCookies(response: {
  cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void };
}) {
  const expired = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
  response.cookies.set(SESSION_COOKIE, "", expired);
  response.cookies.set(PENDING_MFA_COOKIE, "", expired);
  for (const legacy of LEGACY_SESSION_COOKIES) {
    response.cookies.set(legacy, "", expired);
  }
}
