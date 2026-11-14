import { MarketingPage } from "@/components/marketing/MarketingPage";

export const metadata = { title: "Security & Compliance" };

export default function SecurityPage() {
  return (
    <MarketingPage
      eyebrow="Security"
      title="Security and compliance from the foundation"
      lead="MFA, encryption, role- and attribute-based authorization, immutable audit logs, source-rights enforcement, fraud controls, retention, and approval gates are first-class product requirements."
      sections={[
        {
          heading: "Portal isolation",
          body: "Executive, Partner, Attorney, and Owner/Heir portals enforce server-side access isolation. Cross-partner reads are denied and logged.",
        },
        {
          heading: "Source-rights enforcement",
          body: "Connectors cannot execute unauthorized retrieval. Quarantined, expired, prohibited, or human-only sources are blocked.",
        },
        {
          heading: "AI governance",
          body: "Model versions, tool permissions, evaluations, and explicit bans on final legal determinations are enforced in the AI gateway.",
        },
        {
          heading: "Operational readiness",
          body: "Backups, incident runbooks, retention/legal hold, and Guardian monitoring are required before production activation.",
        },
      ]}
    />
  );
}
