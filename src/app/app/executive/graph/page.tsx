import { Panel } from "@/components/ui/Panel";

const nodes = [
  { id: "Person", detail: "Jordan Ellis · aliases · deceased relatives" },
  { id: "Estate", detail: "Dallas Probate Cause (synthetic)" },
  { id: "Property", detail: "Travis County parcel candidate" },
  { id: "Unclaimed", detail: "Harris County funds cluster" },
  { id: "Business", detail: "Historical DBA successor chain" },
  { id: "Evidence", detail: "Provenance-linked vault refs" },
];

export const metadata = { title: "Asset Graph" };

export default function AssetGraphPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-champagne">
          NOVARA Asset Graph™
        </div>
        <h1 className="mt-2 font-display text-4xl text-white">Relationship intelligence</h1>
        <p className="mt-2 max-w-3xl text-sm text-silver">
          Persons, estates, properties, businesses, and evidence fuse with provenance, confidence,
          and downstream-use restrictions. Synthetic preview graph only.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {nodes.map((node) => (
          <Panel key={node.id} gold={node.id === "Estate"}>
            <div className="font-display text-2xl text-white">{node.id}</div>
            <p className="mt-2 text-sm text-silver">{node.detail}</p>
            <div className="mt-4 text-[11px] uppercase tracking-[0.12em] text-champagne">
              Rights-aware node
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
