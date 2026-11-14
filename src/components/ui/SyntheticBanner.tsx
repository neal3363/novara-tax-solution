import { SYNTHETIC_BANNER } from "@/lib/synthetic/data";

export function SyntheticBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "synthetic-badge"
          : "w-full border-b border-champagne/25 bg-champagne/10 px-4 py-2 text-center text-xs font-medium tracking-wide text-champagne-soft"
      }
    >
      {compact ? "Synthetic" : SYNTHETIC_BANNER}
    </div>
  );
}
