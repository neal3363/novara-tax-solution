import type { PortalRole, UserSession } from "@/lib/types";
import { previewUsers } from "@/lib/synthetic/data";

export const SESSION_COOKIE = "novara_ai_session";

export type SessionPayload = {
  role: PortalRole;
  userId: string;
  organizationId: string;
  mfaVerified: true;
  issuedAt: string;
};

export function encodeSession(user: UserSession): string {
  const payload: SessionPayload = {
    role: user.role,
    userId: user.id,
    organizationId: user.organizationId,
    mfaVerified: true,
    issuedAt: new Date().toISOString(),
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  try {
    const json = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as SessionPayload;
    if (!parsed.role || !parsed.userId || !parsed.organizationId || !parsed.mfaVerified) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
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
