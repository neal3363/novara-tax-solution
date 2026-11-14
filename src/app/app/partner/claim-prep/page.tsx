"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export default function ClaimPrepPage() {
  const [packet, setPacket] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">AI Claim Preparation Assistant</h1>
        <p className="mt-2 text-sm text-silver">
          Competitive expansion #3 — drafts claim packets for human review. Does not file or certify claims.
        </p>
      </div>
      <Panel gold>
        <p className="text-sm text-silver">
          Assigned case: Dallas Probate — Estate asset graph (synthetic). Supporting vault docs and
          public record fields will be assembled into a review draft.
        </p>
        <Button
          className="mt-4"
          onClick={() =>
            setPacket(
              [
                "CLAIM PACKET DRAFT (SYNTHETIC — NOT FOR FILING)",
                "Jurisdiction: TX",
                "Matter: Dallas Probate linked unclaimed/estate path",
                "Claimant checklist: government ID, proof of relationship, address attestation",
                "AI note: Confidence advisory only. Counsel review required before any filing.",
                "Watermark: Partner org_partner_tx_01 · anti-circumvention export controls apply",
              ].join("\n"),
            )
          }
        >
          Generate draft packet
        </Button>
      </Panel>
      {packet ? (
        <Panel>
          <pre className="whitespace-pre-wrap font-mono text-xs text-silver">{packet}</pre>
        </Panel>
      ) : null}
    </div>
  );
}
