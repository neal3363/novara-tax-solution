import { USCoverageMap } from "@/components/maps/USCoverageMap";
import { OpportunityTable } from "@/components/portals/OpportunityTable";
import { Panel } from "@/components/ui/Panel";
import { opportunities, stateCoverage } from "@/lib/synthetic/data";

export const metadata = { title: "National Discovery Dashboard" };

export default function DiscoveryDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-champagne">
          National Discovery
        </div>
        <h1 className="mt-2 font-display text-4xl text-white">Interactive discovery dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-silver">
          Official-source-first architecture with publication timestamps, detection latency, and
          rights-gated activation. Connectors are not live in this preview.
        </p>
      </div>

      <USCoverageMap />

      <div className="grid gap-4 lg:grid-cols-3">
        {stateCoverage.map((state) => (
          <Panel key={state.code}>
            <div className="flex items-center justify-between">
              <div className="font-display text-2xl text-white">{state.code}</div>
              <span className="text-xs uppercase tracking-wider text-champagne">{state.status}</span>
            </div>
            <dl className="mt-4 space-y-2 text-sm text-silver">
              <div className="flex justify-between">
                <dt>Connectors</dt>
                <dd className="text-white">{state.connectorCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Opportunities</dt>
                <dd className="text-white">{state.opportunities}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Detection</dt>
                <dd className="text-white">
                  {state.avgDetectionMinutes != null ? `${state.avgDetectionMinutes} min` : "—"}
                </dd>
              </div>
            </dl>
          </Panel>
        ))}
      </div>

      <OpportunityTable rows={opportunities} showAssignment />
    </div>
  );
}
