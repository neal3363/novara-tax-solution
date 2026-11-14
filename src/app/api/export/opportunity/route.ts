import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { opportunities } from "@/lib/synthetic/data";
import { canExportOpportunity, watermarkExportPayload } from "@/lib/rbac/abac";
import { appendAuditEvent } from "@/lib/audit/store";
import { canAccessTerritory } from "@/lib/rbac/abac";

export async function POST(request: Request) {
  const user = await getCurrentSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { opportunityId?: string };
  const opportunity = opportunities.find((o) => o.id === body.opportunityId);
  if (!opportunity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const territory = canAccessTerritory(user, opportunity.state);
  const decision = canExportOpportunity(user, opportunity);
  const allowed = territory.allowed && decision.allowed;

  await appendAuditEvent({
    actor: user.id,
    action: "export_opportunity",
    resource: opportunity.id,
    outcome: allowed ? "allowed" : "denied",
  });

  if (!allowed) {
    return NextResponse.json(
      { error: !territory.allowed ? territory.reason : decision.reason },
      { status: 403 },
    );
  }

  return NextResponse.json({
    export: watermarkExportPayload(user, {
      opportunity,
      exportedAs: "json",
      preview: true,
    }),
  });
}
