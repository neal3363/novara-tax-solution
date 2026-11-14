import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { requirePortalUser } from "@/lib/auth/server";
import { cases, documents } from "@/lib/synthetic/data";
import { listVisibleDocuments } from "@/lib/rbac/documents";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Partner Documents" };

export default async function PartnerDocumentsPage() {
  const user = await requirePortalUser("partner");
  const visible = listVisibleDocuments(user, documents, cases);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-white">Documents & milestones</h1>
      <div className="grid gap-4">
        {visible.map((doc) => (
          <Panel key={doc.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-white">{doc.name}</div>
                <div className="mt-1 text-xs text-silver-muted">
                  {doc.category} · {formatDate(doc.uploadedAt)} · {doc.sensitivity}
                </div>
              </div>
              <Link href={`/api/documents/${doc.id}`} className="text-sm text-champagne">
                Download
              </Link>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
