import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { appendAuditEvent } from "@/lib/audit/store";

export async function POST() {
  appendAuditEvent({
    actor: "session",
    action: "logout",
    resource: "auth",
    outcome: "allowed",
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
