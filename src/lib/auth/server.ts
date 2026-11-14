import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PortalRole, UserSession } from "@/lib/types";
import { SESSION_COOKIE, decodeSession } from "@/lib/auth/cookies";
import {
  authRosterFingerprint,
  findAuthUserById,
  roleRequiresMfa,
  toUserSession,
} from "@/lib/auth/users";
import { appendAuditEvent } from "@/lib/audit/store";

export async function getCurrentSessionUser(): Promise<UserSession | null> {
  const jar = await cookies();
  const payload = await decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  if (payload.rosterFp !== authRosterFingerprint()) return null;

  const record = findAuthUserById(payload.userId);
  if (!record) return null;
  if (record.role !== payload.role || record.organizationId !== payload.organizationId) {
    return null;
  }
  if (roleRequiresMfa(record) && !payload.mfaVerified) return null;

  return toUserSession(record);
}

export async function requirePortalUser(role: PortalRole): Promise<UserSession> {
  const user = await getCurrentSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/app/${role}`)}`);
  }
  if (user.role !== role) {
    await appendAuditEvent({
      actor: user.id,
      action: "portal_isolation_block",
      resource: `/app/${role}`,
      outcome: "denied",
    });
    redirect("/login?error=portal_isolation");
  }
  return user;
}
