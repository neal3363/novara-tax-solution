import { MarketingPage } from "@/components/marketing/MarketingPage";

export const metadata = { title: "Attorney Network" };

export default function AttorneysPage() {
  return (
    <MarketingPage
      eyebrow="Attorney Network"
      title="Integrated counsel by jurisdiction and matter type"
      lead="Conflict checks, privileged workflows, evidence packets, and approval history keep legal work separated from partner economics."
      sections={[
        {
          heading: "Coverage map",
          body: "Attorneys are matched by license, jurisdiction, and matter type before case materials are released.",
        },
        {
          heading: "Conflict protocol",
          body: "Conflict checks run before legal case material release. Denied conflicts are auditable and immutable.",
        },
        {
          heading: "Evidence & deadlines",
          body: "Attorney portal surfaces evidence packets, governing memos, deadlines, and approval queues.",
        },
        {
          heading: "Fee segregation",
          body: "Legal fees remain on a separate ledger from NOVARA/partner economics at all times.",
        },
      ]}
    />
  );
}
