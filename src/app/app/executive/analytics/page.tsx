import { RecoveryChart } from "@/components/charts/RecoveryChart";
import { Panel } from "@/components/ui/Panel";
import { businessModel } from "@/lib/synthetic/data";

export const metadata = { title: "Financial Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Financial analytics</h1>
        <p className="mt-2 text-sm text-silver">
          Ledgers remain separated: asset value, owner distribution, NOVARA revenue, partner
          distribution, attorney fees, third-party costs, and subscriptions.
        </p>
      </div>
      <RecoveryChart />
      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <h2 className="font-display text-2xl text-white">Target economics</h2>
          <p className="mt-3 text-sm text-silver">
            {Math.round(businessModel.novaraShareTarget * 100)}% NOVARA /{" "}
            {Math.round(businessModel.partnerShareTarget * 100)}% partner only when a
            transaction-specific legal model permits it.
          </p>
        </Panel>
        <Panel>
          <h2 className="font-display text-2xl text-white">Attorney fee isolation</h2>
          <p className="mt-3 text-sm text-silver">
            Legal fees never mix into partner or NOVARA deal-share ledgers. Preview numbers are synthetic.
          </p>
        </Panel>
      </div>
    </div>
  );
}
