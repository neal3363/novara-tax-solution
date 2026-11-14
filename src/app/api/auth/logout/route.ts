import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { appendAuditEvent } from "@/lib/audit/store";

export async function POST() {
  await appendAuditEvent({
    actor: "session",
    action: "logout",
    resource: "auth",
    outcome: "allowed",
  });
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
