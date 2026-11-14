import type { PortalRole } from "@/lib/types";
import {
  findAuthUserByEmail,
  getAuthMode,
  loadAuthUsers,
  roleRequiresMfa,
  toUserSession,
  verifyPassword,
} from "@/lib/auth/users";
import { getAuthSecret } from "@/lib/auth/crypto";

export function portalPath(role: PortalRole): string {
  switch (role) {
    case "executive":
      return "/app/executive";
    case "partner":
      return "/app/partner";
    case "attorney":
      return "/app/attorney";
    case "owner":
      return "/app/owner";
  }
}

export function isPasswordAuthConfigured(): boolean {
  const mode = getAuthMode();
  if (!getAuthSecret()) return false;
  if (mode !== "password" && mode !== "both") return false;
  return loadAuthUsers().length > 0;
}

export function isOidcConfigured(): boolean {
  const mode = getAuthMode();
  if (!getAuthSecret()) return false;
  if (mode !== "oidc" && mode !== "both") return false;
  // Roster required so OIDC cannot invent privileged roles.
  if (loadAuthUsers().length === 0) return false;
  return Boolean(
    process.env.AUTH_OIDC_ISSUER?.trim() &&
      process.env.AUTH_OIDC_CLIENT_ID?.trim() &&
      process.env.AUTH_OIDC_CLIENT_SECRET?.trim() &&
      process.env.AUTH_OIDC_REDIRECT_URI?.trim(),
  );
}

export function isAuthConfigured(): boolean {
  return isPasswordAuthConfigured() || isOidcConfigured();
}

export function authenticatePassword(email: string, password: string) {
  if (!isPasswordAuthConfigured()) return null;
  const user = findAuthUserByEmail(email);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return {
    session: toUserSession(user),
    mfaRequired: roleRequiresMfa(user),
    totpSecret: user.totpSecret,
    record: user,
  };
}
