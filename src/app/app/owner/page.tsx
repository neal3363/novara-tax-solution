import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export const metadata = { title: "Owner / Heir Portal" };

export default function OwnerHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-champagne">
          Owner / Heir Portal
        </div>
        <h1 className="mt-2 font-display text-4xl text-white">Secure claimant workspace</h1>
        <p className="mt-2 text-sm text-silver">
          Identity verification, document uploads, claim status, and approved communications only.
          Recovery is never guaranteed.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel gold>
          <h2 className="font-display text-2xl text-white">Next step</h2>
          <p className="mt-2 text-sm text-silver">
            Complete identity verification and upload supporting documents to the secure vault.
          </p>
          <Link href="/app/owner/verify" className="mt-4 inline-block">
            <Button>Continue verification</Button>
          </Link>
        </Panel>
        <Panel>
          <h2 className="font-display text-2xl text-white">Claim status</h2>
          <p className="mt-2 text-sm text-silver">
            Awaiting document vault upload · Identity Agent match score 0.91 (advisory)
          </p>
          <Link href="/app/owner/claims" className="mt-4 inline-block text-sm text-champagne">
            View claim details
          </Link>
        </Panel>
      </div>
    </div>
  );
}
