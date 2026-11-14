import { AssetGraphCanvas } from "@/components/maps/AssetGraphCanvas";

export const metadata = { title: "Asset Graph" };

export default function AssetGraphPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-champagne">
          NOVARA Asset Graph™
        </div>
        <h1 className="mt-2 font-display text-4xl text-white">Interactive relationship intelligence</h1>
        <p className="mt-2 max-w-3xl text-sm text-silver">
          Click nodes to inspect provenance-linked relationships. Synthetic Dallas probate pilot graph
          only — not a live source integration.
        </p>
      </div>
      <AssetGraphCanvas />
    </div>
  );
}
