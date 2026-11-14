import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-[rgba(183,195,213,0.12)] bg-[#080f1c]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6">
        <div>
          <div className="font-display text-2xl text-white">NOVARA</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
            Asset Intelligence™
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-silver-muted">
            Private national asset discovery, recovery, and acquisition intelligence.
            Separate from NOVARA Tax OS. Services do not guarantee recoveries.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-silver">
            Platform
          </div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-silver-muted">
            <Link href="/discovery">National Discovery</Link>
            <Link href="/intelligence">AI Capabilities</Link>
            <Link href="/security">Security & Compliance</Link>
            <Link href="/partners">Partner Opportunities</Link>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-silver">
            Access
          </div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-silver-muted">
            <Link href="/login">Portal Login</Link>
            <Link href="/register">Registration</Link>
            <Link href="/app/executive">Executive Command Center</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-[rgba(183,195,213,0.08)] px-4 py-4 text-center text-[11px] text-silver-muted">
        © {new Date().getFullYear()} NOVARA Development Group. Confidential preview. Version 1.4
        development build.
      </div>
    </footer>
  );
}
