import Link from "next/link";
import { RecoveryChart } from "@/components/charts/RecoveryChart";
import { USCoverageMap } from "@/components/maps/USCoverageMap";
import { OpportunityTable } from "@/components/portals/OpportunityTable";
import { WorkflowRail } from "@/components/portals/WorkflowRail";
import { Button } from "@/components/ui/Button";
import { Stat } from "@/components/ui/Stat";
import { opportunities, recoveryMetrics, auditEvents } from "@/lib/synthetic/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Executive Command Center" };

export default function ExecutiveHomePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-champagne">
            NOVARA Executive Command Center
          </div>
          <h1 className="mt-2 font-display text-4xl text-white md:text-5xl">
            National discovery control
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-silver">
            Master intelligence layer with First Look gates, partner isolation, and Guardian
            monitoring. Preview uses labeled synthetic data only.
          </p>
        </div>
        <Link href="/app/executive/first-look">
          <Button>Open First Look queue</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Pipeline value" value={formatCurrency(recoveryMetrics.pipelineValue)} hint="Synthetic" />
        <Stat label="First Look pending" value={String(recoveryMetrics.firstLookPending)} />
        <Stat label="Avg detection" value={`${recoveryMetrics.avgDetectionMinutes} min`} hint="Pilot target window" />
        <Stat
          label="Partner seats"
          value={`${recoveryMetrics.partnerSeatsFilled}/${recoveryMetrics.partnerSeatsMax}`}
        />
      </div>

      <WorkflowRail activeIndex={5} />
      <USCoverageMap />

      <div className="grid gap-4 xl:grid-cols-2">
        <RecoveryChart />
        <div className="novara-panel p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-silver-muted">
            Recent audit events
          </div>
          <div className="space-y-3">
            {auditEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-md border border-[rgba(183,195,213,0.12)] px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white">{event.action}</span>
                  <span
                    className={
                      event.outcome === "denied" ? "text-[#f0b4b4]" : "text-[#8fd4bb]"
                    }
                  >
                    {event.outcome}
                  </span>
                </div>
                <div className="mt-1 text-xs text-silver-muted">
                  {event.resource} · {formatDate(event.at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-3xl text-white">Opportunity feed</h2>
          <Link href="/app/executive/pipeline" className="text-sm text-champagne">
            View pipeline
          </Link>
        </div>
        <OpportunityTable rows={opportunities} showAssignment />
      </div>
    </div>
  );
}
