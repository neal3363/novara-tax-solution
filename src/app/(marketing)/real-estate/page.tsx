import { MarketingPage } from "@/components/marketing/MarketingPage";

export const metadata = { title: "Real Estate & Acquisition" };

export default function RealEstatePage() {
  return (
    <MarketingPage
      eyebrow="Real Estate"
      title="Acquisition intelligence with title-risk discipline"
      lead="Property, lien, equity, and excess-proceeds intelligence supports KEEP / ACQUIRE / PARTNER decisions after legal and data-rights gates."
      sections={[
        {
          heading: "Property Agent",
          body: "Parcels, deeds, taxes, liens, mortgages, and judgments fuse into Asset Graph nodes with source provenance.",
        },
        {
          heading: "Valuation estimates",
          body: "Valuation Agent produces estimates for internal strategy — not appraisals or guarantees of market outcome.",
        },
        {
          heading: "Legal routing",
          body: "Acquisition workflows route through approved counsel by jurisdiction and matter type with segregated legal fees.",
        },
        {
          heading: "First Look control",
          body: "Material opportunities reach NOVARA first. External partners see only exclusive assignments after release.",
        },
      ]}
    />
  );
}
