import { MarketingPage } from "@/components/marketing/MarketingPage";

export const metadata = { title: "Partner Opportunities" };

export default function PartnersPage() {
  return (
    <MarketingPage
      eyebrow="Partners"
      title="Exclusive seats. Controlled economics. No master-pool access."
      lead="Maximum 100 external partners, two seats per state, target $10,000 monthly subscription. Partners work assigned opportunities only after NOVARA First Look."
      sections={[
        {
          heading: "Exclusive assignment",
          body: "One deal, one active partner unless NOVARA explicitly creates a collaborative transaction.",
        },
        {
          heading: "Anti-circumvention",
          body: "Locks, watermarking, export controls, Collision AI, and audit trails protect exclusivity beyond a single lock field.",
        },
        {
          heading: "Approved economics",
          body: "60% NOVARA / 40% partner is a target only where a transaction-specific legal model permits it — never a universal rule.",
        },
        {
          heading: "Partner AI",
          body: "Isolated assistants answer over assigned case data, milestones, and approved projected economics only.",
        },
      ]}
    />
  );
}
