import type { TaxBracket } from './types'

export function taxFromBrackets(taxableIncome: number, brackets: TaxBracket[]): number {
  if (taxableIncome <= 0) return 0
  let tax = 0
  let prev = 0
  for (const b of brackets) {
    const slice = Math.min(taxableIncome, b.upTo) - prev
    if (slice > 0) tax += slice * b.rate
    if (taxableIncome <= b.upTo) break
    prev = b.upTo
  }
  return Math.round(tax)
}
