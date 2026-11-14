import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  gold = false,
}: {
  children: React.ReactNode;
  className?: string;
  gold?: boolean;
}) {
  return (
    <div className={cn(gold ? "novara-panel-gold" : "novara-panel", "p-5", className)}>
      {children}
    </div>
  );
}
