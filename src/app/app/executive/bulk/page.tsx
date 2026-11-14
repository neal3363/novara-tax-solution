import { BulkCaseOperations } from "@/components/portals/BulkCaseOperations";

export const metadata = { title: "Bulk Case Operations" };

export default function BulkPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Bulk case operations</h1>
        <p className="mt-2 text-sm text-silver">
          Competitive expansion #4 — multi-case actions with preserved per-case audit trails.
        </p>
      </div>
      <BulkCaseOperations />
    </div>
  );
}
