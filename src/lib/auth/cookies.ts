import type { PortalRole, UserSession } from "@/lib/types";
import { previewUsers } from "@/lib/synthetic/data";
import { getAuthSecret, signPayload, verifySignedPayload } from "@/lib/auth/crypto";

export const SESSION_COOKIE = "novara_ai_session";

export type SessionPayload = {
  role: PortalRole;
  userId: string;
  organizationId: string;
  mfaVerified: true;
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

export async function encodeSession(user: UserSession): Promise<string> {
  const secret = getAuthSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }

  const payload: SessionPayload = {
    role: user.role,
    userId: user.id,
    organizationId: user.organizationId,
    mfaVerified: true,
    issuedAt: new Date().toISOString(),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
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
  if (!parsed) return null;
  if (!parsed.role || !parsed.userId || !parsed.organizationId || !parsed.mfaVerified) {
    return null;
  }
  if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return parsed;
}

export function sessionToUser(payload: SessionPayload): UserSession | null {
  const user = Object.values(previewUsers).find((u) => u.id === payload.userId);
  if (!user) return null;
  if (user.role !== payload.role || user.organizationId !== payload.organizationId) {
    return null;
  }
  return user;
}

export function portalFromPath(pathname: string): PortalRole | null {
  if (pathname.startsWith("/app/executive")) return "executive";
  if (pathname.startsWith("/app/partner")) return "partner";
  if (pathname.startsWith("/app/attorney")) return "attorney";
  if (pathname.startsWith("/app/owner")) return "owner";
  return null;
}
