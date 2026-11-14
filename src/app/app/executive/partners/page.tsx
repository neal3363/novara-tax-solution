import { Panel } from "@/components/ui/Panel";
import { businessModel, recoveryMetrics } from "@/lib/synthetic/data";

const partners = [
  { id: "TX-01", name: "Lone Star Recovery Partners", state: "TX", status: "Active", seat: "1 of 2" },
  { id: "TX-02", name: "Capitol Asset Desk", state: "TX", status: "Active", seat: "2 of 2" },
  { id: "FL-01", name: "Gulfstream Locator Group", state: "FL", status: "Waitlist", seat: "pending" },
  { id: "CA-01", name: "Pacific Claims Intelligence", state: "CA", status: "Diligence", seat: "1 of 2" },
];

export const metadata = { title: "Partner Management" };

export default function PartnersAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Partner management</h1>
        <p className="mt-2 text-sm text-silver">
          Max {businessModel.maxExternalPartners} seats · {businessModel.seatsPerState} per state ·
          target ${businessModel.targetMonthlySubscriptionUsd.toLocaleString()}/mo
        </p>
      </div>
      <Panel gold>
        <div className="text-sm text-silver">
          Occupied seats: {recoveryMetrics.partnerSeatsFilled}/{recoveryMetrics.partnerSeatsMax}. Partners
          never receive unrestricted master-pool access.
        </div>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2">
        {partners.map((partner) => (
          <Panel key={partner.id}>
            <div className="flex items-center justify-between">
              <div className="font-display text-2xl text-white">{partner.name}</div>
              <span className="text-xs uppercase tracking-wider text-champagne">{partner.status}</span>
            </div>
            <div className="mt-3 text-sm text-silver">
              {partner.state} · Seat {partner.seat} · ID {partner.id}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
