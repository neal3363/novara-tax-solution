import { applyAnswer, type TaxpayerProfile } from './benefitOptimizer'

export type ParsedFact = {
  mapsTo: string
  value: string | number
  prompt: string
}

/** Parse typed/voice-style statements into structured return fields. */
export function parseTaxpayerStatement(text: string): ParsedFact[] {
  const t = text.trim()
  const lower = t.toLowerCase()
  const moneyMatch = t.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)/)
  const amount = moneyMatch ? Number(moneyMatch[1].replace(/,/g, '')) : NaN
  const facts: ParsedFact[] = []

  if (
    Number.isFinite(amount) &&
    (lower.includes('daycare') ||
      lower.includes('day care') ||
      lower.includes('childcare') ||
      lower.includes('child care') ||
      lower.includes('babysit') ||
      lower.includes('after-school') ||
      lower.includes('after school'))
  ) {
    facts.push({
      mapsTo: 'childcare_amount',
      value: amount,
      prompt: 'Childcare expenses from your statement',
    })
  }

  if (Number.isFinite(amount) && (lower.includes('tuition') || lower.includes('college'))) {
    facts.push({
      mapsTo: 'education_expenses',
      value: 'yes',
      prompt: 'Education expenses from your statement',
    })
    facts.push({
      mapsTo: 'tuition_paid',
      value: amount,
      prompt: 'Tuition amount from your statement',
    })
  }

  if (
    Number.isFinite(amount) &&
    (lower.includes('mortgage') || (lower.includes('interest') && lower.includes('home')))
  ) {
    facts.push({
      mapsTo: 'owns_home',
      value: 'yes',
      prompt: 'Homeownership from your statement',
    })
  }

  if (lower.includes('dependent') || /\b(my|our)\s+(son|daughter|child|kids)\b/.test(lower)) {
    facts.push({
      mapsTo: 'has_dependents',
      value: 'yes',
      prompt: 'Dependents from your statement',
    })
    facts.push({
      mapsTo: 'has_child',
      value: 'yes',
      prompt: 'Child from your statement',
    })
  }

  return facts
}

export function applyParsedFacts(profile: TaxpayerProfile, facts: ParsedFact[]): TaxpayerProfile {
  return facts.reduce((p, f) => {
    let next = applyAnswer(p, f.mapsTo, f.value)
    if (f.mapsTo === 'tuition_paid' && typeof f.value === 'number') {
      next = { ...next, tuitionPaid: f.value, answers: { ...next.answers, education_expenses: 'yes', tuition_paid: f.value } }
    }
    if (f.mapsTo === 'childcare_amount' && typeof f.value === 'number') {
      next = {
        ...next,
        childcarePaid: f.value,
        answers: {
          ...next.answers,
          paid_childcare: 'yes',
          worked_or_looked: 'yes',
          childcare_amount: f.value,
        },
      }
    }
    return next
  }, profile)
}
