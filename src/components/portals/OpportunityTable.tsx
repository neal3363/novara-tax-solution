import { Badge } from "@/components/ui/Badge";
import type { Opportunity } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

const stageTone: Record<string, "gold" | "info" | "success" | "warning" | "neutral" | "danger"> = {
  FIRST_LOOK: "gold",
  LEGAL_GATE: "warning",
  PARTNER: "success",
  WATCH: "info",
  REJECT: "danger",
  DISCOVER: "neutral",
  VERIFY: "info",
};

export function OpportunityTable({
  rows,
  showAssignment = false,
}: {
  rows: Opportunity[];
  showAssignment?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-[rgba(183,195,213,0.14)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-deep-navy/80 text-[11px] uppercase tracking-[0.12em] text-silver-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Opportunity</th>
            <th className="px-4 py-3 font-semibold">State</th>
            <th className="px-4 py-3 font-semibold">Class</th>
            <th className="px-4 py-3 font-semibold">Value</th>
            <th className="px-4 py-3 font-semibold">Stage</th>
            <th className="px-4 py-3 font-semibold">Freshness</th>
            {showAssignment ? <th className="px-4 py-3 font-semibold">Assignment</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-[rgba(183,195,213,0.1)]">
              <td className="px-4 py-3">
                <div className="font-medium text-white">{row.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-silver-muted">
                  <span className="synthetic-badge">Synthetic</span>
                  <span>Confidence {formatPercent(row.confidence)}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-silver">{row.state}</td>
              <td className="px-4 py-3 text-silver">{row.assetClass.replaceAll("_", " ")}</td>
              <td className="px-4 py-3 text-champagne">{formatCurrency(row.estimatedValue)}</td>
              <td className="px-4 py-3">
                <Badge tone={stageTone[row.stage] ?? "neutral"}>{row.stage}</Badge>
              </td>
              <td className="px-4 py-3 text-silver">{row.freshnessMinutes} min</td>
              {showAssignment ? (
                <td className="px-4 py-3 text-silver">
                  {row.assignedPartnerId ?? row.firstLookDecision ?? "—"}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
