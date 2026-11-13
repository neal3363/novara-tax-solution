import { applyAnswer, type TaxpayerProfile } from './benefitOptimizer'

export type ParsedFact = {
  mapsTo: string
  value: string | number
  prompt: string
  needsConfirm?: boolean
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
      needsConfirm: true,
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
      needsConfirm: true,
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
    facts.push({
      mapsTo: 'mortgage_interest_amount',
      value: amount,
      prompt: 'Mortgage interest from your statement',
      needsConfirm: true,
    })
  }

  if (Number.isFinite(amount) && (lower.includes('mile') || lower.includes('mileage'))) {
    facts.push({
      mapsTo: 'business_vehicle',
      value: 'yes',
      prompt: 'Business vehicle from your statement',
    })
    facts.push({
      mapsTo: 'business_miles',
      value: amount,
      prompt: 'Business miles from your statement',
      needsConfirm: true,
    })
  }

  if (
    Number.isFinite(amount) &&
    (lower.includes('business expense') || lower.includes('expenses to') || lower.includes('spent on the business'))
  ) {
    facts.push({
      mapsTo: 'self_employed',
      value: 'yes',
      prompt: 'Self-employment from your statement',
    })
  }

  if (lower.includes('self-employed') || lower.includes('self employed') || lower.includes('freelance')) {
    const no = /\b(not|no longer|aren'?t|am not)\b/.test(lower)
    facts.push({
      mapsTo: 'self_employed',
      value: no ? 'no' : 'yes',
      prompt: 'Self-employment from your statement',
    })
  }

  const kidCount = lower.match(/\b(\d+|one|two|three|four|five)\s+(kids|children|dependents)\b/)
  const mentionsKids =
    lower.includes('dependent') ||
    /\b(my|our)\s+(son|daughter|child|kids|children)\b/.test(lower) ||
    Boolean(kidCount) ||
    /\bhave\s+(\d+|one|two|three|four|five)\s+(kids|children)\b/.test(lower)
  if (mentionsKids) {
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
    facts.push({
      mapsTo: 'potential_dependents',
      value: 'yes',
      prompt: 'Potential dependents from your statement',
    })
    if (kidCount) {
      const word: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 }
      const n = word[kidCount[1]] ?? Number(kidCount[1])
      if (Number.isFinite(n)) {
        facts.push({
          mapsTo: 'dependent_count',
          value: n,
          prompt: 'Dependent count from your statement',
          needsConfirm: true,
        })
      }
    }
  }

  // Dependent name: "my child's name is Emma Blake" / "dependent name is ..."
  const nameMatch = t.match(/(?:(?:child|dependent|son|daughter)(?:'s)?\s+name\s+is|named)\s+([A-Za-z][A-Za-z' -]{1,60})/i)
  if (nameMatch) {
    facts.push({
      mapsTo: 'dep_0_name',
      value: nameMatch[1].trim(),
      prompt: 'Dependent legal name from your statement',
      needsConfirm: true,
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
    if (f.mapsTo === 'business_miles' && typeof f.value === 'number') {
      next = {
        ...next,
        businessMileage: f.value,
        answers: { ...next.answers, business_vehicle: 'yes', business_miles: f.value },
      }
    }
    if (f.mapsTo === 'dep_0_name' && typeof f.value === 'string') {
      // applyAnswer/dep path handles structured dependents when count is set
      next = applyAnswer(next, 'dep_0_name', f.value)
    }
    return next
  }, profile)
}
