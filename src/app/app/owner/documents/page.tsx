"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { documents } from "@/lib/synthetic/data";
import { formatDate } from "@/lib/utils";

export default function OwnerDocumentsPage() {
  const [items, setItems] = useState(documents.filter((d) => d.ownerId === "usr_owner_221"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-white">Secure document vault</h1>
          <p className="mt-2 text-sm text-silver">Encrypted uploads with retention and sensitivity controls.</p>
        </div>
        <Button
          onClick={() =>
            setItems((prev) => [
              ...prev,
              {
                id: `doc_${prev.length + 10}`,
                name: "Proof of address — synthetic upload",
                category: "Identity",
                uploadedAt: new Date().toISOString(),
                sensitivity: "sensitive",
                ownerId: "usr_owner_221",
                synthetic: true,
              },
            ])
          }
        >
          Simulate upload
        </Button>
      </div>
      <div className="grid gap-4">
        {items.map((doc) => (
          <Panel key={doc.id}>
            <div className="text-white">{doc.name}</div>
            <div className="mt-1 text-xs text-silver-muted">
              {doc.category} · {formatDate(doc.uploadedAt)} · {doc.sensitivity}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
