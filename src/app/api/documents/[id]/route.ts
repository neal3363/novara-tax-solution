import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/server";
import { cases, documents } from "@/lib/synthetic/data";
import { canAccessDocument } from "@/lib/rbac/documents";
import { appendAuditEvent } from "@/lib/audit/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const document = documents.find((d) => d.id === id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const decision = canAccessDocument(user, document, cases);
  appendAuditEvent({
    actor: user.id,
    action: "document_download",
    resource: document.id,
    outcome: decision.allowed ? "allowed" : "denied",
  });

  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason }, { status: 403 });
  }

  return NextResponse.json({
    document,
    download: {
      filename: `${document.id}.txt`,
      contentType: "text/plain",
      body: `SYNTHETIC DOCUMENT\n${document.name}\nAuthorized orgs: ${document.authorizedOrganizationIds.join(", ")}\nCases: ${document.caseIds.join(", ")}\n`,
      watermark: {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
      },
    },
  });
}
