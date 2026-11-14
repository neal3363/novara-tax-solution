import Link from "next/link";
import { Hero } from "@/components/marketing/Hero";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { workflowStages, businessModel, competitorGaps } from "@/lib/synthetic/data";

const pillars = [
  {
    title: "National Discovery",
    body: "Official-source-first monitoring across 50 states, D.C., and applicable federal sources — with provenance, freshness, and rights gates.",
    href: "/discovery",
  },
  {
    title: "AI Intelligence",
    body: "Specialized agents for sweep, identity, estate, valuation, compliance, and collision detection. AI recommends; humans and counsel decide.",
    href: "/intelligence",
  },
  {
    title: "Recovery Workflows",
    body: "Claim tracking, document vaults, milestones, and exclusive partner execution without unrestricted master-pool access.",
    href: "/recovery",
  },
  {
    title: "Estate & Acquisition",
    body: "Heir research workspaces, court-ready evidence packets, and real estate / mineral intelligence under legal controls.",
    href: "/estate",
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />

      <section className="border-t border-[rgba(183,195,213,0.1)] bg-[#0a1220]">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-champagne">
              Operating System
            </div>
            <h2 className="mt-3 font-display text-4xl text-white md:text-5xl">
              One composition for national asset intelligence
            </h2>
            <p className="mt-4 text-silver">
              NOVARA Asset Intelligence is a separate platform from NOVARA Tax OS — purpose-built for
              discovery, verification, First Look allocation, and auditable execution.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {pillars.map((pillar) => (
              <Link key={pillar.href} href={pillar.href} className="group">
                <Panel className="h-full transition group-hover:border-champagne/40">
                  <h3 className="font-display text-2xl text-white">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-silver">{pillar.body}</p>
                </Panel>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="novara-atmosphere border-t border-[rgba(183,195,213,0.1)]">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-champagne">
                Core Workflow
              </div>
              <h2 className="mt-2 font-display text-4xl text-white">Visible. Auditable. Gated.</h2>
            </div>
            <Link href="/app/executive">
              <Button variant="secondary">View in Command Center</Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {workflowStages.map((stage) => (
              <div
                key={stage}
                className="rounded-[4px] border border-[rgba(183,195,213,0.18)] bg-deep-navy/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-silver"
              >
                {stage}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[rgba(183,195,213,0.1)] bg-[#080f1c]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-20 md:grid-cols-3 md:px-6">
          <Panel gold className="md:col-span-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-champagne">
              Locked Business Model
            </div>
            <ul className="mt-4 space-y-3 text-sm text-silver">
              <li>Max {businessModel.maxExternalPartners} external partners</li>
              <li>{businessModel.seatsPerState} partner seats per state</li>
              <li>
                Target ${businessModel.targetMonthlySubscriptionUsd.toLocaleString()}/mo
                subscription
              </li>
              <li>NOVARA First Look before external release</li>
              <li>{businessModel.note}</li>
            </ul>
          </Panel>
          <Panel className="md:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-champagne">
              Competitive Expansions (v1.4)
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {competitorGaps.map((gap) => (
                <div
                  key={gap.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-[rgba(183,195,213,0.12)] px-3 py-2 text-sm"
                >
                  <span className="text-white">{gap.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-silver-muted">
                    {gap.status}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </>
  );
}
