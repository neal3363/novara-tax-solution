import { PortalShell } from "@/components/layout/PortalShell";

const nav = [
  { href: "/app/partner", label: "Assigned Portfolio" },
  { href: "/app/partner/cases", label: "Case Management" },
  { href: "/app/partner/assistant", label: "Partner AI Assistant" },
  { href: "/app/partner/documents", label: "Documents & Milestones" },
  { href: "/app/partner/subscription", label: "Subscription" },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell role="partner" nav={nav}>
      {children}
    </PortalShell>
  );
}
