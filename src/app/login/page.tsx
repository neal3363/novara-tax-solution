"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

const DEMO_EMAILS = [
  "executive@novara.preview",
  "partner@novara.preview",
  "attorney@novara.preview",
  "owner@novara.preview",
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(DEMO_EMAILS[0]!);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => {
    if (params.get("error") === "portal_isolation") {
      return "Portal isolation blocked cross-role access.";
    }
    return "";
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        error?: string;
        redirectTo?: string;
        mfaRequired?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? "Invalid credentials.");
        return;
      }
      if (data.mfaRequired) {
        router.push("/login/mfa");
        router.refresh();
        return;
      }
      const next = params.get("next");
      const home = data.redirectTo ?? "/";
      const safeNext =
        next && data.redirectTo && next.startsWith(data.redirectTo) ? next : home;
      router.push(safeNext);
      router.refresh();
    } catch {
      setError("Login service unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel gold className="w-full max-w-md">
      <Link href="/" className="font-display text-3xl text-white">
        NOVARA
      </Link>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
        Asset Intelligence™ · Secure Login
      </div>
      <p className="mt-4 text-sm text-silver">
        Individual user credentials and MFA are required. Shared demo passwords have been removed.
        Portals stay closed unless authentication secrets are configured.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-silver-muted">
          Email
          <input
            className="mt-2 w-full rounded-md border border-[rgba(183,195,213,0.2)] bg-midnight px-3 py-2.5 text-sm text-white outline-none focus:border-champagne/50"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-silver-muted">
          Password
          <input
            type="password"
            className="mt-2 w-full rounded-md border border-[rgba(183,195,213,0.2)] bg-midnight px-3 py-2.5 text-sm text-white outline-none focus:border-champagne/50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-sm text-[#f0b4b4]">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="mt-4">
        <a href="/api/auth/oidc/start" className="text-sm text-champagne hover:underline">
          Sign in with OIDC identity provider
        </a>
      </div>
      <div className="mt-6 space-y-2 text-xs text-silver-muted">
        <div className="font-semibold uppercase tracking-[0.12em] text-silver">Demo emails</div>
        {DEMO_EMAILS.map((value) => (
          <button
            key={value}
            type="button"
            className="block w-full rounded-md border border-[rgba(183,195,213,0.12)] px-3 py-2 text-left hover:border-champagne/40"
            onClick={() => setEmail(value)}
          >
            {value}
          </button>
        ))}
        <p className="pt-2">
          Passwords and TOTP secrets come from `AUTH_USERS_JSON` (or your OIDC IdP). They are never
          shipped in source.
        </p>
      </div>
    </Panel>
  );
}

export default function LoginPage() {
  return (
    <div className="novara-atmosphere flex min-h-screen items-center justify-center px-4 py-16">
      <Suspense fallback={<Panel className="w-full max-w-md text-silver">Loading login…</Panel>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
