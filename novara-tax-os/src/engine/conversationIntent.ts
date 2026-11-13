/**
 * Interpret taxpayer intent / navigation commands for the conversational assistant.
 * Does NOT invent tax amounts — only routes and proposes answer mappings.
 */

export type FilingIntent =
  | 'personal'
  | 'business'
  | 'personal_and_business'
  | 'amend'
  | 'prior_year'
  | 'resume'
  | 'unclear'

export type ConversationCommand =
  | { type: 'intent'; intent: FilingIntent; taxYear?: number; clarify?: string }
  | { type: 'show_unanswered' }
  | { type: 'continue' }
  | { type: 'goto_mapsTo'; mapsTo: string; label: string }
  | { type: 'edit_mapsTo'; mapsTo: string; label: string }
  | { type: 'set_amount'; mapsTo: string; value: number; label: string; needsConfirm: true }
  | { type: 'yes_no'; value: 'yes' | 'no' }
  | { type: 'free_text'; text: string }
  | { type: 'none' }

const TOPIC_MAP: { re: RegExp; mapsTo: string; label: string }[] = [
  { re: /child\s*care|daycare|day care|babysit/, mapsTo: 'paid_childcare', label: 'childcare' },
  { re: /tuition|college|education/, mapsTo: 'education_expenses', label: 'education / tuition' },
  { re: /student\s*loan/, mapsTo: 'student_loan_interest', label: 'student loan interest' },
  { re: /retirement|401\s*k|ira\b/, mapsTo: 'retirement_contributions', label: 'retirement contributions' },
  { re: /self[-\s]?employ|freelance|my business|side (hustle|gig)|business expenses?/, mapsTo: 'self_employed', label: 'self-employment / business' },
  { re: /mileage|vehicle|car for business/, mapsTo: 'business_vehicle', label: 'business vehicle / mileage' },
  { re: /mortgage|own(s)? a home|homeowner/, mapsTo: 'owns_home', label: 'homeownership' },
  { re: /marketplace|healthcare\.gov|obamacare/, mapsTo: 'had_marketplace', label: 'marketplace health insurance' },
  { re: /charit|donation|gave to/, mapsTo: 'charitable_gifts', label: 'charitable gifts' },
  { re: /medical bill/, mapsTo: 'high_medical', label: 'medical expenses' },
  { re: /dependent|my (son|daughter|child|kids)/, mapsTo: 'potential_dependents', label: 'dependents' },
  { re: /married|spouse|filing status/, mapsTo: 'married_dec31', label: 'marital / filing status' },
]

export function detectFilingIntent(text: string): ConversationCommand {
  const lower = text.trim().toLowerCase()
  if (!lower) return { type: 'none' }

  // Navigation / meta commands first
  if (/\b(continue|resume|pick up|where i (left|stopped)|finish where)\b/.test(lower)) {
    return { type: 'continue' }
  }
  if (/\b(what.*(left|unanswered|missing)|show.*(unanswered|remaining)|haven.?t answered)\b/.test(lower)) {
    return { type: 'show_unanswered' }
  }

  const yearMatch = lower.match(/\b(20(?:2[0-9]|1[0-9]))\b/)
  const taxYear = yearMatch ? Number(yearMatch[1]) : undefined

  if (/\b(go back|open|change|edit|update)\b/.test(lower)) {
    for (const t of TOPIC_MAP) {
      if (t.re.test(lower)) {
        const money = lower.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)/)
        if (money && /\b(change|update|set)\b/.test(lower)) {
          const amount = Number(money[1].replace(/,/g, ''))
          if (Number.isFinite(amount)) {
            const amountMaps =
              t.mapsTo === 'paid_childcare'
                ? 'childcare_amount'
                : t.mapsTo === 'education_expenses'
                  ? 'tuition_paid'
                  : t.mapsTo === 'business_vehicle'
                    ? 'business_miles'
                    : t.mapsTo === 'retirement_contributions'
                      ? 'retirement_contribution_amount'
                      : t.mapsTo
            return {
              type: 'set_amount',
              mapsTo: amountMaps,
              value: amount,
              label: t.label,
              needsConfirm: true,
            }
          }
        }
        return {
          type: /\b(change|edit|update)\b/.test(lower) ? 'edit_mapsTo' : 'goto_mapsTo',
          mapsTo: t.mapsTo,
          label: t.label,
        }
      }
    }
  }

  if (/^(yes|yeah|yep|correct|that.?s right)\b/.test(lower)) return { type: 'yes_no', value: 'yes' }
  if (/^(no|nope|incorrect)\b/.test(lower)) return { type: 'yes_no', value: 'no' }

  const wantsPersonal = /\b(personal|individual|my taxes|1040|family)\b/.test(lower) || /\bfil(e|ing)\b/.test(lower)
  const wantsBusiness = /\b(business|self[-\s]?employ|schedule c|llc|corporation|s[-\s]?corp|partnership|freelance)\b/.test(
    lower,
  )
  const wantsAmend = /\bamend|1040[-\s]?x|fix my\b/.test(lower)
  const wantsPrior = Boolean(taxYear) || /\bprior[-\s]?year|last year|previous year\b/.test(lower)

  if (wantsAmend) {
    return {
      type: 'intent',
      intent: 'amend',
      taxYear,
      clarify: taxYear
        ? undefined
        : 'Which tax year do you want to amend? (for example 2023)',
    }
  }
  if (wantsPrior && !wantsPersonal && !wantsBusiness) {
    return { type: 'intent', intent: 'prior_year', taxYear }
  }
  if (wantsPersonal && wantsBusiness) {
    return {
      type: 'intent',
      intent: 'personal_and_business',
      taxYear,
      clarify:
        'Is your business a sole proprietorship (Schedule C on your personal return), or a separate partnership/corporation return?',
    }
  }
  if (wantsBusiness && !wantsPersonal) {
    return {
      type: 'intent',
      intent: 'business',
      taxYear,
      clarify:
        'What kind of business is it — sole proprietorship, partnership, S-corp, or C-corp? We won’t create a separate entity return unless it’s required.',
    }
  }
  if (wantsPersonal || /\bi('?m| am) filing\b/.test(lower)) {
    return { type: 'intent', intent: 'personal', taxYear }
  }
  if (/\b(started|in progress|unfinished)\b/.test(lower)) {
    return { type: 'intent', intent: 'resume' }
  }

  return { type: 'free_text', text: text.trim() }
}

export function intentRoutePath(intent: FilingIntent): string {
  switch (intent) {
    case 'resume':
    case 'personal':
    case 'personal_and_business':
    case 'business':
      return '/app/taxpayer/assistant'
    case 'amend':
    case 'prior_year':
      return '/app/taxpayer/years/select'
    default:
      return '/app/taxpayer/assistant'
  }
}
