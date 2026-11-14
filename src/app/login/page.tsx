"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { authenticatePreview, portalPath } from "@/lib/auth/session";
import { previewUsers } from "@/lib/synthetic/data";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(previewUsers.executive.email);
  const [password, setPassword] = useState("novara-preview");
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const user = authenticatePreview(email, password);
    if (!user) {
      setError("Invalid preview credentials.");
      return;
    }
    router.push(portalPath(user.role));
  }

  return (
    <div className="novara-atmosphere flex min-h-screen items-center justify-center px-4 py-16">
      <Panel gold className="w-full max-w-md">
        <Link href="/" className="font-display text-3xl text-white">
          NOVARA
        </Link>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
          Asset Intelligence™ · Secure Login
        </div>
        <p className="mt-4 text-sm text-silver">
          Preview authentication only. MFA is simulated as enabled for all demo roles.
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
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
        <div className="mt-6 space-y-2 text-xs text-silver-muted">
          <div className="font-semibold uppercase tracking-[0.12em] text-silver">
            Demo roles
          </div>
          {Object.values(previewUsers).map((u) => (
            <button
              key={u.id}
              type="button"
              className="block w-full rounded-md border border-[rgba(183,195,213,0.12)] px-3 py-2 text-left hover:border-champagne/40"
              onClick={() => setEmail(u.email)}
            >
              {u.role}: {u.email}
            </button>
          ))}
          <p className="pt-2">Password for all demo users: novara-preview</p>
        </div>
      </Panel>
    </div>
  );
}
