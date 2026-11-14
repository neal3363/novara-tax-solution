import { Panel } from "@/components/ui/Panel";
import { cases, previewUsers } from "@/lib/synthetic/data";
import { listVisibleCases } from "@/lib/rbac/policy";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Partner Cases" };

export default function PartnerCasesPage() {
  const visible = listVisibleCases(previewUsers.partner, cases);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-white">Case management</h1>
      <div className="grid gap-4">
        {visible.map((item) => (
          <Panel key={item.id}>
            <div className="font-display text-2xl text-white">{item.title}</div>
            <div className="mt-2 text-sm text-silver">{item.status}</div>
            <div className="mt-1 text-xs text-silver-muted">
              Milestone: {item.milestone} · Updated {formatDate(item.updatedAt)}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
