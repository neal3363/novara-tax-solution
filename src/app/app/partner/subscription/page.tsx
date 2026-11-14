import { Panel } from "@/components/ui/Panel";
import { businessModel } from "@/lib/synthetic/data";

export const metadata = { title: "Partner Subscription" };

export default function PartnerSubscriptionPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-white">Subscription management</h1>
      <Panel gold>
        <div className="text-[11px] uppercase tracking-[0.14em] text-champagne">Texas Seat 1</div>
        <div className="mt-2 font-display text-3xl text-white">
          ${businessModel.targetMonthlySubscriptionUsd.toLocaleString()}/month
        </div>
        <p className="mt-3 text-sm text-silver">
          Preview billing only. Production subscriptions require executed partner agreements,
          compliance standing, and payment controls.
        </p>
      </Panel>
      <Panel>
        <h2 className="font-display text-2xl text-white">Approved deal economics</h2>
        <p className="mt-3 text-sm text-silver">
          Projected partner share displays only for compensation models approved for the specific
          transaction. 60/40 is not a universal legal rule.
        </p>
      </Panel>
    </div>
  );
}
