import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { competitorGaps } from "@/lib/synthetic/data";

const gates = [
  { name: "Legal memorandum (TX + Unclaimed + Recovery)", status: "Approved", tone: "success" as const },
  { name: "Data Rights Record — TX Comptroller connector", status: "Draft", tone: "warning" as const },
  { name: "Compensation model binding", status: "Transaction-specific", tone: "info" as const },
  { name: "Source permission class enforcement", status: "Active in policy engine", tone: "success" as const },
  { name: "AI legal-determination ban", status: "Hard-coded false", tone: "gold" as const },
];

export const metadata = { title: "Compliance Dashboard" };

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Compliance dashboard</h1>
        <p className="mt-2 text-sm text-silver">
          Approval bundles must be current at action time. Expired controls block affected actions.
        </p>
      </div>
      <div className="grid gap-4">
        {gates.map((gate) => (
          <Panel key={gate.name}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-white">{gate.name}</div>
              <Badge tone={gate.tone}>{gate.status}</Badge>
            </div>
          </Panel>
        ))}
      </div>
      <div>
        <h2 className="mb-3 font-display text-3xl text-white">v1.4 competitive expansions</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {competitorGaps.map((gap) => (
            <Panel key={gap.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-white">{gap.name}</div>
                  <div className="mt-1 text-xs text-silver-muted">Influence: {gap.influence}</div>
                </div>
                <Badge tone="neutral">{gap.status}</Badge>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
