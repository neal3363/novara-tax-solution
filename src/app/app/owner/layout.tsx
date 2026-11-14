import { PortalShell } from "@/components/layout/PortalShell";

const nav = [
  { href: "/app/owner", label: "Claim Home" },
  { href: "/app/owner/verify", label: "Identity Verification" },
  { href: "/app/owner/documents", label: "Document Vault" },
  { href: "/app/owner/claims", label: "Claim Status" },
  { href: "/app/owner/notifications", label: "Notifications" },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell role="owner" nav={nav}>
      {children}
    </PortalShell>
  );
}
