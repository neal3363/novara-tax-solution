import { applyAnswer, type TaxpayerProfile } from './benefitOptimizer'

export type ParsedFact = {
  mapsTo: string
  value: string | number
  prompt: string
  needsConfirm?: boolean
}

const MONTHS: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
}

function cleanSpokenName(raw: string): string {
  return raw
    .replace(/[.,;:!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function parseSpokenDob(text: string): string | null {
  const numeric = text.match(
    /\b(?:dob|date of birth|born(?: on)?|birthday(?: is)?)\s*(?:is\s*|was\s*)?(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/i,
  )
  if (numeric) {
    const mm = numeric[1].padStart(2, '0')
    const dd = numeric[2].padStart(2, '0')
    let yyyy = numeric[3]
    if (yyyy.length === 2) yyyy = Number(yyyy) > 30 ? `19${yyyy}` : `20${yyyy}`
    return `${yyyy}-${mm}-${dd}`
  }
  const named = text.match(
    /\b(?:dob|date of birth|born(?: on)?|birthday(?: is)?)\s*(?:is\s*|was\s*)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
  )
  if (named) {
    const mm = MONTHS[named[1].toLowerCase()]
    const dd = named[2].padStart(2, '0')
    return `${named[3]}-${mm}-${dd}`
  }
  return null
}

/** Personal-identity fields spoken into the mic / typed into the compose box. */
export function parsePersonalIdentityFacts(text: string): ParsedFact[] {
  const t = text.trim()
  const lower = t.toLowerCase()
  const facts: ParsedFact[] = []

  const nameMatch = t.match(
    /\b(?:my (?:full )?(?:legal )?name is|i(?:'m| am)|this is|name['’]s)\s+([A-Za-z][A-Za-z' -]{1,60}?)(?=(?:,|\.|$|\band\b|\bi\s|\bmy\s|\blive\b|\bphone\b|\bemail\b|\bssn\b|\bsocial\b|\bborn\b|\bdob\b|\bfiling\b))/i,
  )
  if (nameMatch) {
    const name = cleanSpokenName(nameMatch[1])
    if (name.split(' ').length >= 2 || name.length >= 3) {
      facts.push({
        mapsTo: 'full_name',
        value: name,
        prompt: 'Legal name from your spoken statement',
        needsConfirm: true,
      })
    }
  }

  const dob = parseSpokenDob(t)
  if (dob) {
    facts.push({
      mapsTo: 'date_of_birth',
      value: dob,
      prompt: 'Date of birth from your spoken statement',
      needsConfirm: true,
    })
  }

  const emailMatch = t.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i)
  if (emailMatch) {
    facts.push({
      mapsTo: 'email',
      value: emailMatch[1].toLowerCase(),
      prompt: 'Email from your spoken statement',
      needsConfirm: true,
    })
  }

  const phoneMatch = t.match(
    /\b(?:my )?(?:phone(?: number)?|cell(?: phone)?|mobile(?: number)?|number)\s*(?:is|:)?\s*(\+?1[\s.-]?)?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/i,
  )
  if (phoneMatch) {
    const phone = `${phoneMatch[2]}-${phoneMatch[3]}-${phoneMatch[4]}`
    facts.push({
      mapsTo: 'phone',
      value: phone,
      prompt: 'Phone from your spoken statement',
      needsConfirm: true,
    })
  } else {
    const loosePhone = t.match(/\b(\+?1[\s.-]?)?\(?(\d{3})\)?[\s.-](\d{3})[\s.-](\d{4})\b/)
    if (loosePhone && (lower.includes('phone') || lower.includes('call') || lower.includes('number'))) {
      facts.push({
        mapsTo: 'phone',
        value: `${loosePhone[2]}-${loosePhone[3]}-${loosePhone[4]}`,
        prompt: 'Phone from your spoken statement',
        needsConfirm: true,
      })
    }
  }

  const addressMatch = t.match(
    /\b(?:i live at|my address is|address is|i reside at)\s+(.+?)(?=(?:,?\s+my\s|\band my\b|\.|$))/i,
  )
  if (addressMatch) {
    const address = addressMatch[1].replace(/\s+/g, ' ').replace(/[.,;]+$/g, '').trim()
    if (address.length >= 8) {
      facts.push({
        mapsTo: 'address',
        value: address,
        prompt: 'Address from your spoken statement',
        needsConfirm: true,
      })
    }
  }

  // Never store a full SSN — last four only (demo-safe).
  const last4 =
    t.match(/\b(?:ssn|social(?: security)?(?: number)?)\s*(?:ends? in|last four(?: digits)?(?: is| are)?|ending in)\s*(\d{4})\b/i) ||
    t.match(/\b(?:ssn|social(?: security)?(?: number)?)\s*(?:is|:)?\s*\d{3}[-\s]?\d{2}[-\s]?(\d{4})\b/i)
  if (last4) {
    facts.push({
      mapsTo: 'ssn_last4',
      value: last4[1],
      prompt: 'SSN last four from your spoken statement',
      needsConfirm: true,
    })
  }

  if (/\b(single|never married)\b/.test(lower) && !/\bmarried\b/.test(lower)) {
    facts.push({ mapsTo: 'filing_status', value: 'single', prompt: 'Filing status from your spoken statement' })
    facts.push({ mapsTo: 'unmarried_or_considered', value: 'yes', prompt: 'Unmarried status from your spoken statement' })
  } else if (/\bmarried filing jointly\b|\bmfj\b|\bfiling jointly\b/.test(lower)) {
    facts.push({ mapsTo: 'filing_status', value: 'mfj', prompt: 'Filing status from your spoken statement' })
    facts.push({ mapsTo: 'married_dec31', value: 'Yes', prompt: 'Marriage status from your spoken statement' })
  } else if (/\bhead of household\b|\bhoh\b/.test(lower)) {
    facts.push({ mapsTo: 'filing_status', value: 'hoh', prompt: 'Filing status from your spoken statement' })
  } else if (/\bmarried filing separately\b|\bmfs\b/.test(lower)) {
    facts.push({ mapsTo: 'filing_status', value: 'mfs', prompt: 'Filing status from your spoken statement' })
  }

  return facts
}

export function isPersonalIdentityMapsTo(mapsTo: string): boolean {
  return (
    mapsTo === 'full_name' ||
    mapsTo === 'date_of_birth' ||
    mapsTo === 'email' ||
    mapsTo === 'phone' ||
    mapsTo === 'address' ||
    mapsTo === 'ssn_last4'
  )
}

/** Parse typed/voice-style statements into structured return fields. */
export function parseTaxpayerStatement(text: string): ParsedFact[] {
  const t = text.trim()
  const lower = t.toLowerCase()
  const moneyMatch = t.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)/)
  const amount = moneyMatch ? Number(moneyMatch[1].replace(/,/g, '')) : NaN
  const facts: ParsedFact[] = [...parsePersonalIdentityFacts(t)]

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
    if (isPersonalIdentityMapsTo(f.mapsTo) && typeof f.value === 'string') {
      next = {
        ...next,
        answers: { ...next.answers, [f.mapsTo]: f.value },
      }
    }
    if (f.mapsTo === 'filing_status' && typeof f.value === 'string') {
      const status = f.value as TaxpayerProfile['filingStatus']
      if (status === 'single' || status === 'mfj' || status === 'hoh' || status === 'mfs' || status === 'qss') {
        next = { ...next, filingStatus: status }
      }
    }
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

/** Snapshot of personal-info answers for the Personal questionnaire tab. */
export function personalIdentityProgress(profile: TaxpayerProfile): {
  mapsTo: string
  prompt: string
  value: string | null
  status: 'answered' | 'unanswered'
}[] {
  const rows: { mapsTo: string; prompt: string }[] = [
    { mapsTo: 'full_name', prompt: 'Full legal name' },
    { mapsTo: 'date_of_birth', prompt: 'Date of birth' },
    { mapsTo: 'ssn_last4', prompt: 'SSN last four' },
    { mapsTo: 'address', prompt: 'Mailing address' },
    { mapsTo: 'phone', prompt: 'Phone number' },
    { mapsTo: 'email', prompt: 'Email address' },
  ]
  return rows.map((r) => {
    const raw = profile.answers[r.mapsTo]
    const value = raw == null || raw === '' ? null : String(raw)
    return {
      ...r,
      value,
      status: value ? ('answered' as const) : ('unanswered' as const),
    }
  })
}
