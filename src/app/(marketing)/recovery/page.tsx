import { MarketingPage } from "@/components/marketing/MarketingPage";

export const metadata = { title: "Unclaimed Property Recovery" };

export default function RecoveryPage() {
  return (
    <MarketingPage
      eyebrow="Recovery"
      title="Structured recovery workflows with evidence discipline"
      lead="Track claims from discovery through verification, document vaulting, legal gates, and close — without implying that every identified asset will be recovered."
      sections={[
        {
          heading: "Claim preparation",
          body: "AI Claim Preparation Assistant drafts packages from authorized records and vaulted documents for human review before any filing action.",
        },
        {
          heading: "Document vault",
          body: "Encrypted claimant document vault with sensitivity labels, retention rules, and role-scoped access for owners, partners, and counsel.",
        },
        {
          heading: "Performance visibility",
          body: "Recovery performance dashboards surface pipeline value, cycle times, and outcomes using approved ledger categories — never mixed with attorney fees.",
        },
        {
          heading: "Bulk operations",
          body: "Authorized bulk case operations support multi-entity review while preserving per-case audit trails and approval gates.",
        },
      ]}
    />
  );
}
