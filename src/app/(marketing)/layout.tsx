import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicNav } from "@/components/layout/PublicNav";
import { SyntheticBanner } from "@/components/ui/SyntheticBanner";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-midnight text-white">
      <SyntheticBanner />
      <PublicNav />
      {children}
      <PublicFooter />
    </div>
  );
}
