import { MarketingPage } from "@/components/marketing/MarketingPage";

export const metadata = { title: "AI Intelligence" };

export default function IntelligencePage() {
  return (
    <MarketingPage
      eyebrow="AI Capabilities"
      title="Specialized agents. Bounded authority."
      lead="From National Sweep to Collision AI, NOVARA agents recommend, score, and assist — they cannot finalize legal determinations of ownership, heirship, title, or entitlement."
      sections={[
        {
          heading: "Command & Guardian",
          body: "Command AI briefs executives. Guardian AI monitors publication windows, detection latency, stale feeds, security anomalies, and backup health.",
        },
        {
          heading: "Domain agents",
          body: "Identity, Property, Estate, Heir, Unclaimed Asset, Bankruptcy, Court Funds, Federal, Mineral/Royalty, and Business agents operate under source-rights and tool permissions.",
        },
        {
          heading: "Strategy & allocation",
          body: "Strategy Agent recommends KEEP / PARTNER / RELEASE / WATCH / REJECT. Allocation Agent routes only to eligible exclusive partners after First Look.",
        },
        {
          heading: "Partner AI isolation",
          body: "Each partner receives an isolated assistant scoped to assigned cases only — never the master opportunity pool or other partners' portfolios.",
        },
      ]}
    />
  );
}
