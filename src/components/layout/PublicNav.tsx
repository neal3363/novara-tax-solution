"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const links = [
  { href: "/discovery", label: "Discovery" },
  { href: "/intelligence", label: "AI Intelligence" },
  { href: "/recovery", label: "Recovery" },
  { href: "/estate", label: "Estate & Heirs" },
  { href: "/real-estate", label: "Real Estate" },
  { href: "/attorneys", label: "Attorneys" },
  { href: "/partners", label: "Partners" },
  { href: "/security", label: "Security" },
];

export function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(183,195,213,0.12)] bg-[#0b1426]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="group flex min-w-0 flex-col">
          <span className="font-display text-2xl leading-none tracking-tight text-white md:text-[1.7rem]">
            NOVARA
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
            Asset Intelligence™
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium tracking-wide text-silver transition hover:text-white",
                pathname === link.href && "text-champagne",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login">
            <Button variant="ghost" className="!py-2 !text-xs">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button className="!py-2 !text-xs">Request Access</Button>
          </Link>
        </div>

        <button
          className="rounded-md border border-[rgba(183,195,213,0.2)] p-2 text-silver lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[rgba(183,195,213,0.12)] bg-deep-navy px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm text-silver hover:bg-white/5 hover:text-white",
                  pathname === link.href && "text-champagne",
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="secondary" className="w-full !text-xs">
                  Login
                </Button>
              </Link>
              <Link href="/register" className="flex-1" onClick={() => setOpen(false)}>
                <Button className="w-full !text-xs">Request Access</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
