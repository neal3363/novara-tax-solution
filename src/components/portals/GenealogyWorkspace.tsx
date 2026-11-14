"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Note = {
  id: string;
  subject: string;
  detail: string;
  confidence: number;
  contradiction?: string;
};

const seed: Note[] = [
  {
    id: "n1",
    subject: "Parentage lead — Ellis line",
    detail: "Obituary names Jordan as surviving child. Requires vital-record corroboration.",
    confidence: 0.78,
  },
  {
    id: "n2",
    subject: "Name variant",
    detail: "R. Ellis vs Robert Ellis appears across deed and probate captions.",
    confidence: 0.71,
    contradiction: "Middle initial inconsistency unresolved",
  },
  {
    id: "n3",
    subject: "International cousin lead",
    detail: "Possible UK cousin referenced in 1998 letter. Route to approved international researcher.",
    confidence: 0.42,
  },
];

export function GenealogyWorkspace() {
  const [notes, setNotes] = useState(seed);
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-4">
      <Panel gold>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-champagne">
              Forensic Genealogy Workspace
            </div>
            <h2 className="mt-1 font-display text-3xl text-white">Research board</h2>
            <p className="mt-2 max-w-2xl text-sm text-silver">
              Organize notes, contradictions, and confidence scores. Outputs remain advisory — not
              legal heirship determinations.
            </p>
          </div>
          <span className="synthetic-badge">Synthetic</span>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {notes.map((note) => (
          <Panel key={note.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="font-display text-2xl text-white">{note.subject}</div>
              <Badge tone={note.contradiction ? "warning" : "info"}>
                {Math.round(note.confidence * 100)}%
              </Badge>
            </div>
            <p className="mt-3 text-sm text-silver">{note.detail}</p>
            {note.contradiction ? (
              <p className="mt-3 text-xs text-[#e6d08a]">Contradiction: {note.contradiction}</p>
            ) : null}
          </Panel>
        ))}
      </div>

      <Panel>
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-silver-muted">
          Add research note
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-md border border-[rgba(183,195,213,0.2)] bg-midnight px-3 py-2 text-sm text-white outline-none focus:border-champagne/50"
          placeholder="Record a new lead, source citation, or contradiction…"
        />
        <Button
          className="mt-3"
          onClick={() => {
            if (!draft.trim()) return;
            setNotes((prev) => [
              ...prev,
              {
                id: `n_${prev.length + 1}`,
                subject: "Manual research note",
                detail: draft.trim(),
                confidence: 0.5,
              },
            ]);
            setDraft("");
          }}
        >
          Save note
        </Button>
      </Panel>
    </div>
  );
}
