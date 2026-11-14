"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const layers = [
  { id: "identity", label: "Identity aliases", status: "Ready (synthetic)", rights: "Licensed enrichment pending" },
  { id: "address", label: "Address history", status: "Queued", rights: "Requires approved provider" },
  { id: "corporate", label: "Corporate successors", status: "Ready (synthetic)", rights: "Official filings first" },
  { id: "property", label: "Lien/judgment pointers", status: "Pilot", rights: "TX pilot sources only" },
];

export function EnrichmentPanel() {
  const [log, setLog] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      <Panel gold>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-champagne">
          Intelligence Enrichment Engine
        </div>
        <h2 className="mt-1 font-display text-3xl text-white">Authorized enrichment layers</h2>
        <p className="mt-2 text-sm text-silver">
          Official sources remain primary. Licensed third-party enrichment is secondary and cannot
          overwrite official provenance.
        </p>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        {layers.map((layer) => (
          <Panel key={layer.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium text-white">{layer.label}</div>
              <Badge tone="neutral">{layer.status}</Badge>
            </div>
            <p className="mt-2 text-xs text-silver-muted">{layer.rights}</p>
            <Button
              variant="secondary"
              className="mt-3 !text-xs"
              onClick={() =>
                setLog((prev) => [
                  `Enrichment job queued for ${layer.label} — rights gate checked (preview).`,
                  ...prev,
                ])
              }
            >
              Queue enrichment
            </Button>
          </Panel>
        ))}
      </div>
      {log.length ? (
        <Panel>
          <div className="text-[11px] uppercase tracking-[0.12em] text-silver-muted">Job log</div>
          <ul className="mt-2 space-y-2 text-sm text-silver">
            {log.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
