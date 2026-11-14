import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "border-[rgba(183,195,213,0.25)] text-silver bg-white/5",
    gold: "border-champagne/40 text-champagne bg-champagne/10",
    success: "border-[rgba(61,155,122,0.4)] text-[#8fd4bb] bg-[rgba(61,155,122,0.12)]",
    warning: "border-[rgba(201,162,39,0.4)] text-[#e6d08a] bg-[rgba(201,162,39,0.12)]",
    danger: "border-[rgba(196,92,92,0.4)] text-[#f0b4b4] bg-[rgba(196,92,92,0.12)]",
    info: "border-[rgba(91,143,191,0.4)] text-[#9bc4e3] bg-[rgba(91,143,191,0.12)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
