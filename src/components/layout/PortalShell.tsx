"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Shield, X } from "lucide-react";
import type { PortalRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SyntheticBanner } from "@/components/ui/SyntheticBanner";
import { previewUsers } from "@/lib/synthetic/data";

export type NavItem = { href: string; label: string };

const roleLabels: Record<PortalRole, string> = {
  executive: "Executive Command Center",
  partner: "Partner Portal",
  attorney: "Attorney Portal",
  owner: "Owner / Heir Portal",
};

export function PortalShell({
  role,
  nav,
  children,
}: {
  role: PortalRole;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const user = previewUsers[role];
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-midnight text-white">
      <SyntheticBanner />
      <div className="flex min-h-[calc(100vh-36px)]">
        <aside className="hidden w-64 shrink-0 border-r border-[rgba(183,195,213,0.12)] bg-[#0a1220] lg:flex lg:flex-col">
          <div className="border-b border-[rgba(183,195,213,0.12)] px-5 py-5">
            <Link href="/" className="font-display text-xl text-white">
              NOVARA
            </Link>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-champagne">
              {roleLabels[role]}
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm text-silver transition hover:bg-white/5 hover:text-white",
                  pathname === item.href && "bg-champagne/10 text-champagne",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-[rgba(183,195,213,0.12)] p-4 text-xs text-silver-muted">
            <div className="flex items-center gap-2 text-champagne">
              <Shield size={14} />
              MFA enabled (preview)
            </div>
            <div className="mt-2">{user.name}</div>
            <div>{user.organizationName}</div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[rgba(183,195,213,0.12)] px-4 py-3 lg:hidden">
            <div>
              <div className="font-display text-lg">NOVARA</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-champagne">
                {roleLabels[role]}
              </div>
            </div>
            <button
              className="rounded-md border border-[rgba(183,195,213,0.2)] p-2 text-silver"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle portal navigation"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
          {open ? (
            <div className="border-b border-[rgba(183,195,213,0.12)] bg-deep-navy p-3 lg:hidden">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm text-silver",
                    pathname === item.href && "text-champagne",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
