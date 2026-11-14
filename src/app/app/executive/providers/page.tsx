import { ProviderComparison } from "@/components/portals/ProviderComparison";

export const metadata = { title: "Provider Comparison" };

export default function ProvidersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Data provider comparison</h1>
        <p className="mt-2 text-sm text-silver">
          Competitive expansion #10 — official-source-first scorecards and Source ROI visibility.
        </p>
      </div>
      <ProviderComparison />
    </div>
  );
}
