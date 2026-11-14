"use client";

import { useMemo, useState } from "react";
import { cases } from "@/lib/synthetic/data";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";

const actions = [
  "Flag for QC review",
  "Request document vault items",
  "Advance milestone (preview)",
  "Export watermarked packet",
] as const;

export function BulkCaseOperations({ partnerOnly = false }: { partnerOnly?: boolean }) {
  const rows = useMemo(
    () => (partnerOnly ? cases.filter((c) => c.partnerVisible) : cases),
    [partnerOnly],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function runAction(action: (typeof actions)[number]) {
    if (!selected.length) {
      setMessage("Select at least one case.");
      return;
    }
    setMessage(
      `Bulk action “${action}” queued for ${selected.length} case(s). Each case retains an individual audit trail. Synthetic preview only.`,
    );
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-silver-muted">
              Bulk Case Operations
            </div>
            <div className="font-display text-2xl text-white">Multi-select with per-case audit</div>
          </div>
          <span className="synthetic-badge">Synthetic</span>
        </div>
        <div className="space-y-2">
          {rows.map((row) => (
            <label
              key={row.id}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-[rgba(183,195,213,0.12)] px-3 py-3 hover:border-champagne/35"
            >
              <input
                type="checkbox"
                checked={selected.includes(row.id)}
                onChange={() => toggle(row.id)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-white">{row.title}</span>
                  <Badge tone="neutral">{row.state}</Badge>
                </div>
                <div className="mt-1 text-xs text-silver-muted">
                  {row.status} · {row.milestone}
                </div>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button key={action} variant="secondary" className="!text-xs" onClick={() => runAction(action)}>
              {action}
            </Button>
          ))}
        </div>
        {message ? <p className="mt-3 text-sm text-champagne">{message}</p> : null}
      </Panel>
    </div>
  );
}
