import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-champagne text-midnight hover:bg-champagne-soft shadow-[0_0_0_1px_rgba(216,181,106,0.3)]",
  secondary:
    "bg-transparent text-white border border-[rgba(183,195,213,0.28)] hover:border-champagne/50 hover:text-champagne",
  ghost: "bg-transparent text-silver hover:text-white hover:bg-white/5",
  danger: "bg-[rgba(196,92,92,0.15)] text-[#f0b4b4] border border-[rgba(196,92,92,0.35)]",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[6px] px-4 py-2.5 text-sm font-semibold tracking-wide transition disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
