"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

function MfaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState(() =>
    params.get("error") === "mfa_required"
      ? "Provider-verified MFA is required for portal access."
      : "",
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { error?: string; redirectTo?: string };
      if (!res.ok) {
        setError(data.error ?? "Invalid MFA code.");
        return;
      }
      router.push(data.redirectTo ?? "/");
      router.refresh();
    } catch {
      setError("MFA service unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel gold className="w-full max-w-md">
      <Link href="/login" className="font-display text-3xl text-white">
        NOVARA
      </Link>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
        MFA Verification
      </div>
      <p className="mt-4 text-sm text-silver">
        Enter the current authenticator code. MFA is never auto-verified.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-silver-muted">
          Authenticator code
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            className="mt-2 w-full rounded-md border border-[rgba(183,195,213,0.2)] bg-midnight px-3 py-2.5 text-sm tracking-[0.2em] text-white outline-none focus:border-champagne/50"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
          />
        </label>
        {error ? <p className="text-sm text-[#f0b4b4]">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Verifying…" : "Verify MFA"}
        </Button>
      </form>
    </Panel>
  );
}

export default function MfaPage() {
  return (
    <div className="novara-atmosphere flex min-h-screen items-center justify-center px-4 py-16">
      <Suspense fallback={<Panel className="w-full max-w-md text-silver">Loading MFA…</Panel>}>
        <MfaForm />
      </Suspense>
    </div>
  );
}
