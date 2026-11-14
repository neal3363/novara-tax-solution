import { OpportunityTable } from "@/components/portals/OpportunityTable";
import { Panel } from "@/components/ui/Panel";
import { partnerOpportunities, previewUsers } from "@/lib/synthetic/data";
import { listVisibleOpportunities } from "@/lib/rbac/policy";

export const metadata = { title: "Partner Portal" };

export default function PartnerHomePage() {
  const user = previewUsers.partner;
  const visible = listVisibleOpportunities(user);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-champagne">
          Partner Portal
        </div>
        <h1 className="mt-2 font-display text-4xl text-white">Assigned opportunities only</h1>
        <p className="mt-2 max-w-3xl text-sm text-silver">
          {user.organizationName} · Territory {user.territories.join(", ")}. Master discovery pool
          access is denied by policy.
        </p>
      </div>
      <Panel gold>
        <p className="text-sm text-silver">
          Visible opportunities: {visible.length}. Cross-partner and unreleased First Look records
          are excluded server-side.
        </p>
      </Panel>
      <OpportunityTable rows={partnerOpportunities} />
    </div>
  );
}
