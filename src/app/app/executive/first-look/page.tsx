"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { opportunities } from "@/lib/synthetic/data";
import type { FirstLookDecision } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const decisions: FirstLookDecision[] = ["KEEP", "PARTNER", "RELEASE", "WATCH", "REJECT"];

export default function FirstLookPage() {
  const queue = opportunities.filter((o) => o.stage === "FIRST_LOOK" || o.stage === "LEGAL_GATE");
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-champagne">
          NOVARA First Look™
        </div>
        <h1 className="mt-2 font-display text-4xl text-white">Internal release gate</h1>
        <p className="mt-2 max-w-3xl text-sm text-silver">
          Material opportunities reach NOVARA before any partner visibility. Decisions are preview
          simulations and do not mutate production systems.
        </p>
      </div>

      <div className="grid gap-4">
        {queue.map((opp) => (
          <Panel key={opp.id} gold>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-display text-2xl text-white">{opp.title}</div>
                <div className="mt-1 text-sm text-silver">
                  {opp.state} · {formatCurrency(opp.estimatedValue)} · {opp.freshnessMinutes} min fresh
                </div>
              </div>
              <Badge tone="gold">{opp.stage}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {decisions.map((decision) => (
                <Button
                  key={decision}
                  variant={decision === "REJECT" ? "danger" : decision === "PARTNER" ? "primary" : "secondary"}
                  className="!text-xs"
                  onClick={() =>
                    setNotes((prev) => ({
                      ...prev,
                      [opp.id]: `Preview decision recorded: ${decision}`,
                    }))
                  }
                >
                  {decision}
                </Button>
              ))}
            </div>
            {notes[opp.id] ? (
              <p className="mt-3 text-sm text-champagne">{notes[opp.id]}</p>
            ) : (
              <p className="mt-3 text-xs text-silver-muted">
                Strategy Agent may recommend; executive confirms. Legal/data-rights gates remain mandatory.
              </p>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
