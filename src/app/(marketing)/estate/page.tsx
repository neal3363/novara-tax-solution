import { MarketingPage } from "@/components/marketing/MarketingPage";

export const metadata = { title: "Estate & Heir Research" };

export default function EstatePage() {
  return (
    <MarketingPage
      eyebrow="Estate & Heirs"
      title="Professional estate research with legal credibility"
      lead="Forensic genealogy workspaces, evidence presentation, and attorney review queues help assemble probable heir graphs — without automated heirship determinations."
      sections={[
        {
          heading: "Forensic genealogy workspace",
          body: "Organize research notes, vital-record references, contradictions, and confidence scores in a court-aware research environment.",
        },
        {
          heading: "Court-ready evidence",
          body: "Report Agent and evidence generator assemble provenance-linked packets suitable for counsel review and filing preparation.",
        },
        {
          heading: "International routing",
          body: "International heir research routing scaffolds handoffs to approved researchers under jurisdiction-specific controls.",
        },
        {
          heading: "Human / professional gate",
          body: "Final heirship and entitlement conclusions require qualified professional review. AI remains advisory.",
        },
      ]}
    />
  );
}
