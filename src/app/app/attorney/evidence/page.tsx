import { Panel } from "@/components/ui/Panel";
import { documents } from "@/lib/synthetic/data";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Evidence Packets" };

export default function EvidencePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-white">Court-ready evidence packets</h1>
      <p className="text-sm text-silver">
        Report Agent assembles provenance-linked packets for counsel review. Preview documents are synthetic.
      </p>
      <div className="grid gap-4">
        {documents.map((doc) => (
          <Panel key={doc.id}>
            <div className="text-white">{doc.name}</div>
            <div className="mt-1 text-xs text-silver-muted">
              {doc.category} · {doc.sensitivity} · {formatDate(doc.uploadedAt)}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
