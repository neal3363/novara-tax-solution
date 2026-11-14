import { PortalShell } from "@/components/layout/PortalShell";
import { requirePortalUser } from "@/lib/auth/server";

const nav = [
  { href: "/app/owner", label: "Claim Home" },
  { href: "/app/owner/verify", label: "Identity Verification" },
  { href: "/app/owner/documents", label: "Document Vault" },
  { href: "/app/owner/claims", label: "Claim Status" },
  { href: "/app/owner/notifications", label: "Notifications" },
];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  await requirePortalUser("owner");
  return (
    <PortalShell role="owner" nav={nav}>
      {children}
    </PortalShell>
  );
}
