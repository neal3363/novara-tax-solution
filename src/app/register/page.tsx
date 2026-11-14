"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="novara-atmosphere flex min-h-screen items-center justify-center px-4 py-16">
      <Panel className="w-full max-w-lg">
        <Link href="/" className="font-display text-3xl text-white">
          NOVARA
        </Link>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
          Access Request
        </div>
        {submitted ? (
          <div className="mt-6">
            <h1 className="font-display text-3xl text-white">Request recorded</h1>
            <p className="mt-3 text-sm text-silver">
              This form does <strong className="text-white">not</strong> create accounts or assign
              privileged roles. An administrator must provision users in the identity roster /
              IdP and enable MFA before portal access is possible.
            </p>
            <Link href="/login" className="mt-6 inline-block">
              <Button>Go to Login</Button>
            </Link>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <p className="text-sm text-silver">
              Request interest only. Privileged roles cannot be self-assigned. Production access
              requires admin provisioning, MFA, and compliance review.
            </p>
            <input
              required
              placeholder="Full name"
              className="w-full rounded-md border border-[rgba(183,195,213,0.2)] bg-midnight px-3 py-2.5 text-sm text-white outline-none focus:border-champagne/50"
            />
            <input
              required
              type="email"
              placeholder="Work email"
              className="w-full rounded-md border border-[rgba(183,195,213,0.2)] bg-midnight px-3 py-2.5 text-sm text-white outline-none focus:border-champagne/50"
            />
            <select
              className="w-full rounded-md border border-[rgba(183,195,213,0.2)] bg-midnight px-3 py-2.5 text-sm text-white outline-none focus:border-champagne/50"
              defaultValue="partner_interest"
            >
              <option value="partner_interest">Partner seat interest (not an account)</option>
              <option value="attorney_interest">Attorney network interest (not an account)</option>
              <option value="owner_interest">Owner / heir workspace interest (not an account)</option>
            </select>
            <textarea
              rows={4}
              placeholder="Jurisdiction, practice focus, or claim context"
              className="w-full rounded-md border border-[rgba(183,195,213,0.2)] bg-midnight px-3 py-2.5 text-sm text-white outline-none focus:border-champagne/50"
            />
            <Button type="submit" className="w-full">
              Submit interest request
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
