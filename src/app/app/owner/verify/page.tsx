"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export default function VerifyPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-white">Identity verification</h1>
      <Panel gold>
        <div className="text-sm text-silver">Step {step} of 3 · MFA-bound claimant flow (preview)</div>
        <div className="mt-4 space-y-3 text-sm text-white">
          {step === 1 && <p>Confirm legal name and contact channels used for approved communications.</p>}
          {step === 2 && <p>Upload government ID to the encrypted vault. Files remain sensitivity-labeled.</p>}
          {step === 3 && <p>Review attestation language. Identity Agent scores are advisory only.</p>}
        </div>
        <div className="mt-5 flex gap-2">
          <Button
            variant="secondary"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Back
          </Button>
          <Button onClick={() => setStep((s) => Math.min(3, s + 1))}>
            {step === 3 ? "Submit for review" : "Continue"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
