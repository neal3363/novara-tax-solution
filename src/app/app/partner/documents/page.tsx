import { Panel } from "@/components/ui/Panel";
import { documents } from "@/lib/synthetic/data";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Partner Documents" };

export default function PartnerDocumentsPage() {
  const visible = documents.filter((d) => d.ownerId === "org_partner_tx_01" || d.category === "Claim Prep");
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
              <span className="synthetic-badge">Synthetic</span>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
