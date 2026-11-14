import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export function MarketingPage({
  eyebrow,
  title,
  lead,
  sections,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <div className="novara-atmosphere">
      <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
        <div className="animate-fade-up">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-champagne">
            {eyebrow}
          </div>
          <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-silver md:text-lg">{lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register">
              <Button>Request Access</Button>
            </Link>
            <Link href="/security">
              <Button variant="secondary">Security & Compliance</Button>
            </Link>
          </div>
        </div>

        <div className="novara-gold-rule my-12" />

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section, i) => (
            <Panel
              key={section.heading}
              className={i === 0 ? "animate-fade-up-delay-1" : "animate-fade-up-delay-2"}
            >
              <h2 className="font-display text-2xl text-white">{section.heading}</h2>
              <p className="mt-3 text-sm leading-relaxed text-silver">{section.body}</p>
            </Panel>
          ))}
        </div>

        <p className="mt-10 text-xs text-silver-muted">
          NOVARA does not guarantee recoveries, ownership determinations, or entitlement outcomes.
          AI may recommend and assist but cannot make final legal determinations.
        </p>
      </div>
    </div>
  );
}
