export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect width="64" height="64" rx="14" fill="#062E2B" />
      <path d="M16 44V20h6.2l9.4 15.6V20H38v24h-6.2L22.4 28.4V44H16z" fill="#E8F5F2" />
      <circle cx="46" cy="22" r="4" fill="#2DD4BF" />
    </svg>
  )
}
