import type { PortalRole, UserSession } from "@/lib/types";
import { previewUsers } from "@/lib/synthetic/data";
import { getPreviewAuthPassword, timingSafeEqualString } from "@/lib/auth/crypto";

export function getPreviewUser(role: PortalRole): UserSession {
  return previewUsers[role];
}

export function authenticatePreview(
  email: string,
  password: string,
): UserSession | null {
  const expectedPassword = getPreviewAuthPassword();
  if (!expectedPassword) return null;
  if (!timingSafeEqualString(password, expectedPassword)) return null;

  const match = Object.values(previewUsers).find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  return match ?? null;
}

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

export function isPreviewAuthConfigured(): boolean {
  return Boolean(getPreviewAuthPassword());
}
