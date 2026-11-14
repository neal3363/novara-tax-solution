import { Panel } from "@/components/ui/Panel";
import { cases, previewUsers } from "@/lib/synthetic/data";
import { listVisibleCases } from "@/lib/rbac/policy";

export const metadata = { title: "Attorney Portal" };

export default function AttorneyHomePage() {
  const visible = listVisibleCases(previewUsers.attorney, cases);
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-champagne">
          Attorney Portal
        </div>
        <h1 className="mt-2 font-display text-4xl text-white">Assigned legal matters</h1>
        <p className="mt-2 text-sm text-silver">
          Probate, heirship review, and evidence workflows with segregated legal fees.
        </p>
      </div>
      <div className="grid gap-4">
        {visible.map((item) => (
          <Panel key={item.id} gold>
            <div className="font-display text-2xl text-white">{item.title}</div>
            <div className="mt-2 text-sm text-silver">{item.status}</div>
            <div className="mt-1 text-xs text-silver-muted">Deadline Agent tracking active</div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
