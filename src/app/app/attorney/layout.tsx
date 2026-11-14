import { PortalShell } from "@/components/layout/PortalShell";
import { requirePortalUser } from "@/lib/auth/server";

const nav = [
  { href: "/app/attorney", label: "Legal Queue" },
  { href: "/app/attorney/cases", label: "Assigned Cases" },
  { href: "/app/attorney/genealogy", label: "Genealogy Workspace" },
  { href: "/app/attorney/international", label: "International Routing" },
  { href: "/app/attorney/evidence", label: "Evidence Packets" },
  { href: "/app/attorney/approvals", label: "Legal Approvals" },
  { href: "/app/attorney/conflicts", label: "Conflict Checks" },
];

export default async function AttorneyLayout({ children }: { children: React.ReactNode }) {
  await requirePortalUser("attorney");
  return (
    <PortalShell role="attorney" nav={nav}>
      {children}
    </PortalShell>
  );
}
