import { MarketingPage } from "@/components/marketing/MarketingPage";

export const metadata = { title: "National Asset Discovery" };

export default function DiscoveryPage() {
  return (
    <MarketingPage
      eyebrow="National Discovery"
      title="Official-source-first asset discovery across America"
      lead="NOVARA continuously monitors approved official sources for unclaimed funds, property records, probate, bankruptcy, court funds, mineral interests, and business ownership intelligence — with provenance and freshness displayed."
      sections={[
        {
          heading: "50 states + D.C. + federal",
          body: "Coverage expands state-by-state only after legal memoranda, data-rights records, connector certification, and security review. Preview maps show gated vs pilot status clearly.",
        },
        {
          heading: "5–15 minute detection target",
          body: "Where technically and contractually supported, NOVARA targets detection within 5–15 minutes of official publication. Government publication delay is never marketed as NOVARA latency.",
        },
        {
          heading: "Delta ingestion & dedupe",
          body: "Change events, idempotent processing, reconciliation, and quarantine for schema risk keep the Asset Graph clean without fabricating records.",
        },
        {
          heading: "No guaranteed recoveries",
          body: "Discovery identifies opportunities for authorized workflows. Entitlement, ownership, and recovery outcomes require verification, counsel, and applicable law.",
        },
      ]}
    />
  );
}
