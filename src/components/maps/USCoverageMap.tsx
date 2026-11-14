"use client";

import { useMemo, useState } from "react";
import { nationalCoverageMap } from "@/lib/synthetic/data";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const statusTone = {
  live: "success" as const,
  pilot: "gold" as const,
  queued: "info" as const,
  gated: "neutral" as const,
};

export function USCoverageMap() {
  const [selected, setSelected] = useState("TX");
  const selectedState = useMemo(
    () => nationalCoverageMap.find((s) => s.code === selected) ?? nationalCoverageMap[0],
    [selected],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="novara-panel p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-silver-muted">
              National Coverage
            </div>
            <h3 className="font-display text-2xl text-white">Interactive U.S. Map</h3>
          </div>
          <span className="synthetic-badge">Synthetic</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-11">
          {nationalCoverageMap.map((state) => (
            <button
              key={state.code}
              type="button"
              onClick={() => setSelected(state.code)}
              className={cn(
                "rounded-[4px] border px-1 py-2 text-[10px] font-semibold tracking-wide transition",
                state.status === "pilot" && "animate-map-glow border-champagne/50 bg-champagne/20 text-champagne",
                state.status === "live" && "border-[rgba(61,155,122,0.5)] bg-[rgba(61,155,122,0.18)] text-[#8fd4bb]",
                state.status === "queued" && "border-[rgba(91,143,191,0.35)] bg-[rgba(91,143,191,0.12)] text-[#9bc4e3]",
                state.status === "gated" && "border-[rgba(183,195,213,0.12)] bg-white/[0.03] text-silver-muted",
                selected === state.code && "ring-1 ring-champagne",
              )}
              title={state.name}
            >
              {state.code}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-silver-muted">
          <Badge tone="success">Live</Badge>
          <Badge tone="gold">Pilot</Badge>
          <Badge tone="info">Queued</Badge>
          <Badge tone="neutral">Rights-gated</Badge>
        </div>
      </div>

      <div className="novara-panel-gold p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-3xl text-white">{selectedState.code}</div>
            <div className="text-sm text-silver">{selectedState.name}</div>
          </div>
          <Badge tone={statusTone[selectedState.status]}>{selectedState.status}</Badge>
        </div>
        <div className="novara-gold-rule my-4" />
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-silver-muted">Official connectors</dt>
            <dd className="font-medium text-white">{selectedState.connectorCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-silver-muted">Preview opportunities</dt>
            <dd className="font-medium text-white">{selectedState.opportunities}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-silver-muted">Avg detection</dt>
            <dd className="font-medium text-white">
              {selectedState.avgDetectionMinutes != null
                ? `${selectedState.avgDetectionMinutes} min`
                : "Pending rights"}
            </dd>
          </div>
        </dl>
        <p className="mt-5 text-xs leading-relaxed text-silver-muted">
          States activate only after legal memorandum, data-rights record, connector certification,
          and security review. No fabricated live integrations.
        </p>
      </div>
    </div>
  );
}
