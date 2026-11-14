import { BulkCaseOperations } from "@/components/portals/BulkCaseOperations";

export const metadata = { title: "Partner Bulk Operations" };

export default function PartnerBulkPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Bulk operations</h1>
        <p className="mt-2 text-sm text-silver">
          Limited to your assigned portfolio. Master pool remains inaccessible.
        </p>
      </div>
      <BulkCaseOperations partnerOnly />
    </div>
  );
}
