import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import type { PortalRole, UserSession } from "@/lib/types";

export type AuthUserRecord = {
  id: string;
  name: string;
  email: string;
  role: PortalRole;
  organizationId: string;
  organizationName: string;
  territories: string[];
  mfaRequired: boolean;
  passwordHash: string;
  totpSecret: string;
};

export function getAuthMode(): "password" | "oidc" | "both" | null {
  const mode = process.env.AUTH_MODE?.trim().toLowerCase();
  if (mode === "password" || mode === "oidc" || mode === "both") return mode;
  return null;
}

export function loadAuthUsers(): AuthUserRecord[] {
  const raw = process.env.AUTH_USERS_JSON?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AuthUserRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (u) =>
        u?.id &&
        u.email &&
        u.role &&
        u.organizationId &&
        u.passwordHash &&
        u.totpSecret,
    );
  } catch {
    return [];
  }
}

export function findAuthUserByEmail(email: string): AuthUserRecord | null {
  const normalized = email.trim().toLowerCase();
  return loadAuthUsers().find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export function findAuthUserById(id: string): AuthUserRecord | null {
  return loadAuthUsers().find((u) => u.id === id) ?? null;
}

export function verifyPassword(password: string, encodedHash: string): boolean {
  const parts = encodedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4]!, "base64url");
  const expected = Buffer.from(parts[5]!, "base64url");
  if (!N || !r || !p || !salt.length || !expected.length) return false;
  const actual = scryptSync(password, salt, expected.length, { N, r, p });
  return timingSafeEqual(actual, expected);
}

export function toUserSession(user: AuthUserRecord): UserSession {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: user.organizationName,
    territories: user.territories,
    mfaEnabled: user.mfaRequired,
    previewMode: true,
  };
}

export function privilegedRoles(): PortalRole[] {
  return ["executive", "partner", "attorney", "owner"];
}

export function roleRequiresMfa(user: AuthUserRecord): boolean {
  return user.mfaRequired || privilegedRoles().includes(user.role);
}

/** Stable fingerprint of configured users for session invalidation when roster changes. */
export function authRosterFingerprint(): string {
  const material = loadAuthUsers()
    .map((u) => `${u.id}:${u.role}:${u.organizationId}:${u.passwordHash.slice(0, 12)}`)
    .sort()
    .join("|");
  return createHash("sha256").update(material || "empty").digest("hex").slice(0, 16);
}
