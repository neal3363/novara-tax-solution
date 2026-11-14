import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { requirePortalUser } from "@/lib/auth/server";
import { cases, documents } from "@/lib/synthetic/data";
import { listVisibleDocuments } from "@/lib/rbac/documents";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Evidence Packets" };

export default async function EvidencePage() {
  const user = await requirePortalUser("attorney");
  const visible = listVisibleDocuments(user, documents, cases);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-white">Court-ready evidence packets</h1>
      <p className="text-sm text-silver">
        Only documents explicitly authorized for your assigned matters are listed. Synthetic preview
        data.
      </p>
      <div className="grid gap-4">
        {visible.map((doc) => (
          <Panel key={doc.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-white">{doc.name}</div>
                <div className="mt-1 text-xs text-silver-muted">
                  {doc.category} · {doc.sensitivity} · {formatDate(doc.uploadedAt)} · cases{" "}
                  {doc.caseIds.join(", ")}
                </div>
              </div>
              <Link
                href={`/api/documents/${doc.id}`}
                className="text-sm text-champagne hover:underline"
              >
                Download
              </Link>
            </div>
          </Panel>
        ))}
        {!visible.length ? (
          <Panel>
            <p className="text-sm text-silver">No authorized evidence packets for your assignments.</p>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
