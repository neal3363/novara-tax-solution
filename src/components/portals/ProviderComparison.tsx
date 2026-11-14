import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";

const providers = [
  {
    name: "Official state source (P1–P4)",
    freshness: "Primary",
    cost: "Connector ops",
    quality: "Authoritative",
    role: "Primary freshness",
  },
  {
    name: "Licensed enrichment A",
    freshness: "Secondary",
    cost: "Per-hit (pending license)",
    quality: "Pointer data",
    role: "Verification / history",
  },
  {
    name: "Licensed enrichment B",
    freshness: "Secondary",
    cost: "Seat + usage",
    quality: "Batch research",
    role: "Backup only",
  },
];

export function ProviderComparison() {
  return (
    <div className="space-y-4">
      <Panel gold>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-champagne">
          Data Provider Comparison Engine
        </div>
        <h2 className="mt-1 font-display text-3xl text-white">Source ROI scorecards</h2>
        <p className="mt-2 text-sm text-silver">
          Delayed aggregators must never become the primary freshness source when an approved
          official source is available.
        </p>
      </Panel>
      <div className="grid gap-4">
        {providers.map((provider) => (
          <Panel key={provider.name}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-display text-2xl text-white">{provider.name}</div>
              <Badge tone={provider.role.includes("Primary") ? "gold" : "neutral"}>
                {provider.role}
              </Badge>
            </div>
            <dl className="mt-4 grid gap-2 text-sm text-silver sm:grid-cols-3">
              <div>
                <dt className="text-silver-muted">Freshness class</dt>
                <dd className="text-white">{provider.freshness}</dd>
              </div>
              <div>
                <dt className="text-silver-muted">Cost model</dt>
                <dd className="text-white">{provider.cost}</dd>
              </div>
              <div>
                <dt className="text-silver-muted">Quality role</dt>
                <dd className="text-white">{provider.quality}</dd>
              </div>
            </dl>
          </Panel>
        ))}
      </div>
    </div>
  );
}
