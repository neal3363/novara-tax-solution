import { PortalShell } from "@/components/layout/PortalShell";

const nav = [
  { href: "/app/executive", label: "Command Overview" },
  { href: "/app/executive/discovery", label: "National Discovery" },
  { href: "/app/executive/graph", label: "Asset Graph" },
  { href: "/app/executive/pipeline", label: "Opportunity Pipeline" },
  { href: "/app/executive/valuation", label: "Asset Valuation" },
  { href: "/app/executive/first-look", label: "NOVARA First Look" },
  { href: "/app/executive/partners", label: "Partner Management" },
  { href: "/app/executive/analytics", label: "Financial Analytics" },
  { href: "/app/executive/guardian", label: "Guardian AI" },
  { href: "/app/executive/compliance", label: "Compliance" },
];

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell role="executive" nav={nav}>
      {children}
    </PortalShell>
  );
}
