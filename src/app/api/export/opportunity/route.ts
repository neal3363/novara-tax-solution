import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, decodeSession, sessionToUser } from "@/lib/auth/cookies";
import { opportunities } from "@/lib/synthetic/data";
import { canExportOpportunity, watermarkExportPayload } from "@/lib/rbac/abac";
import { appendAuditEvent } from "@/lib/audit/store";

export async function POST(request: Request) {
  const jar = await cookies();
  const session = await decodeSession(jar.get(SESSION_COOKIE)?.value);
  const user = session ? sessionToUser(session) : null;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { opportunityId?: string };
  const opportunity = opportunities.find((o) => o.id === body.opportunityId);
  if (!opportunity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const decision = canExportOpportunity(user, opportunity);
  appendAuditEvent({
    actor: user.id,
    action: "export_opportunity",
    resource: opportunity.id,
    outcome: decision.allowed ? "allowed" : "denied",
  });

  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason }, { status: 403 });
  }

  return NextResponse.json({
    export: watermarkExportPayload(user, {
      opportunity,
      exportedAs: "json",
      preview: true,
    }),
  });
}
