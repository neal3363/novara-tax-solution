import { EnrichmentPanel } from "@/components/portals/EnrichmentPanel";

export const metadata = { title: "Intelligence Enrichment" };

export default function EnrichmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Intelligence Enrichment Engine</h1>
        <p className="mt-2 text-sm text-silver">
          Competitive expansion #1 — rights-gated enrichment that never overwrites official provenance.
        </p>
      </div>
      <EnrichmentPanel />
    </div>
  );
}
