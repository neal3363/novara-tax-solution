"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export default function ApprovalsPage() {
  const [status, setStatus] = useState("Pending counsel review");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-white">Legal approvals</h1>
      <Panel gold>
        <div className="font-display text-2xl text-white">Evidence packet release</div>
        <p className="mt-2 text-sm text-silver">
          Approving publishes a review decision trail. It does not create law or bypass memo gates.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setStatus("Approved for partner milestone advance (preview)")}>
            Approve
          </Button>
          <Button variant="secondary" onClick={() => setStatus("Returned with conditions (preview)")}>
            Return
          </Button>
        </div>
        <p className="mt-3 text-sm text-champagne">{status}</p>
      </Panel>
    </div>
  );
}
