import { Panel } from "@/components/ui/Panel";
import { opportunities } from "@/lib/synthetic/data";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Asset Valuation" };

export default function ValuationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Asset valuation</h1>
        <p className="mt-2 text-sm text-silver">
          Valuation Agent estimates support strategy only — not appraisals or guarantees.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {opportunities.map((opp) => (
          <Panel key={opp.id}>
            <div className="text-xs uppercase tracking-[0.12em] text-silver-muted">{opp.state}</div>
            <div className="mt-1 font-display text-2xl text-white">{opp.title}</div>
            <div className="mt-4 text-3xl text-champagne">{formatCurrency(opp.estimatedValue)}</div>
            <p className="mt-2 text-xs text-silver-muted">
              Estimate confidence {Math.round(opp.confidence * 100)}% · Synthetic preview
            </p>
          </Panel>
        ))}
      </div>
    </div>
  );
}
