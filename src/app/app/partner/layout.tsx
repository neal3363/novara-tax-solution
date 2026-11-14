import { PortalShell } from "@/components/layout/PortalShell";
import { requirePortalUser } from "@/lib/auth/server";

const nav = [
  { href: "/app/partner", label: "Assigned Portfolio" },
  { href: "/app/partner/cases", label: "Case Management" },
  { href: "/app/partner/bulk", label: "Bulk Operations" },
  { href: "/app/partner/claim-prep", label: "Claim Prep Assistant" },
  { href: "/app/partner/assistant", label: "Partner AI Assistant" },
  { href: "/app/partner/documents", label: "Documents & Milestones" },
  { href: "/app/partner/subscription", label: "Subscription" },
];

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  await requirePortalUser("partner");
  return (
    <PortalShell role="partner" nav={nav}>
      {children}
    </PortalShell>
  );
}
