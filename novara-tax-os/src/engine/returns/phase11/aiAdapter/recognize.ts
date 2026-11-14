/**
 * Isolated AI interview adapters — recognition only.
 * Do NOT import into benefitOptimizer, interview UI, or Refund Maximizer.
 * wireAiToInterview remains hard-false.
 */

import { normalizeStateCode, getStateTables } from '../state/tables'
import { detectUnsupportedState } from '../state/compute'

export type AiRecognitionKind =
  | 'state_specific_question'
  | 'business_return_requirement'
  | 'amended_return_change'
  | 'missing_supporting_document'
  | 'tax_saving_opportunity'

export interface AiRecognitionItem {
  kind: AiRecognitionKind
  id: string
  message: string
  priority: 'low' | 'medium' | 'high'
  mapsToSuggestedOnly: true
}

export interface AiAdapterProfileLite {
  taxYear?: number
  filingState?: string
  residency?: string
  hasBusinessIncome?: boolean
  entityType?: 'sole_prop' | 'partnership' | 's_corp' | 'c_corp' | 'unknown'
  filingMode?: 'original' | 'amended'
  documents?: string[]
  answers?: Record<string, unknown>
}

/**
 * Produce recognition hints for a future interview wiring approval.
 * Pure function — no store mutations, no Maximizer calls.
 */
export function recognizeInterviewNeeds(profile: AiAdapterProfileLite): AiRecognitionItem[] {
  const items: AiRecognitionItem[] = []
  const year = profile.taxYear ?? 2025
  const docs = new Set((profile.documents ?? []).map((d) => d.toLowerCase()))

  if (profile.filingState) {
    const code = normalizeStateCode(String(profile.filingState))
    const det = detectUnsupportedState(code, year)
    if (!det.supported) {
      items.push({
        kind: 'state_specific_question',
        id: 'state_unsupported',
        message: `State ${code} is not validated for filing — collect residency facts but do not claim state e-file.`,
        priority: 'high',
        mapsToSuggestedOnly: true,
      })
    } else {
      const tables = getStateTables(code, year)
      items.push({
        kind: 'state_specific_question',
        id: 'state_residency',
        message: `Ask residency / part-year / multi-state allocation for ${tables?.stateName ?? code}.`,
        priority: 'medium',
        mapsToSuggestedOnly: true,
      })
      if (tables?.hasPersonalIncomeTax) {
        items.push({
          kind: 'state_specific_question',
          id: 'state_withholding',
          message: 'Ask for state wage withholding (W-2 box 17) and state credits eligibility.',
          priority: 'medium',
          mapsToSuggestedOnly: true,
        })
      }
    }
  } else {
    items.push({
      kind: 'state_specific_question',
      id: 'filing_state_missing',
      message: 'Ask which state was the main home for tax purposes.',
      priority: 'high',
      mapsToSuggestedOnly: true,
    })
  }

  if (profile.hasBusinessIncome || profile.entityType) {
    const entity = profile.entityType ?? 'unknown'
    items.push({
      kind: 'business_return_requirement',
      id: `entity_${entity}`,
      message:
        entity === 'partnership'
          ? 'Collect Form 1065 inputs and partner ownership % for K-1 generation.'
          : entity === 's_corp'
            ? 'Collect Form 1120-S inputs and shareholder ownership % for K-1 generation.'
            : entity === 'c_corp'
              ? 'Collect Form 1120 income, deductions, estimated payments.'
              : 'Clarify business entity type (Schedule C vs 1065 / 1120-S / 1120).',
      priority: 'high',
      mapsToSuggestedOnly: true,
    })
    if (!docs.has('pl') && !docs.has('profit_loss') && !docs.has('books')) {
      items.push({
        kind: 'missing_supporting_document',
        id: 'missing_pl',
        message: 'Missing profit & loss / books for business return.',
        priority: 'high',
        mapsToSuggestedOnly: true,
      })
    }
    items.push({
      kind: 'tax_saving_opportunity',
      id: 'section179_dep',
      message: 'Evaluate Section 179 / depreciation elections for business assets (staging).',
      priority: 'low',
      mapsToSuggestedOnly: true,
    })
  }

  if (profile.filingMode === 'amended') {
    items.push({
      kind: 'amended_return_change',
      id: 'amended_auth',
      message: 'Require taxpayer authorization before computing Form 1040-X.',
      priority: 'high',
      mapsToSuggestedOnly: true,
    })
    items.push({
      kind: 'amended_return_change',
      id: 'amended_compare',
      message: 'Collect corrected income, deductions, and credits vs original filed return.',
      priority: 'high',
      mapsToSuggestedOnly: true,
    })
    if (!docs.has('original_return') && !docs.has('1040')) {
      items.push({
        kind: 'missing_supporting_document',
        id: 'missing_original_return',
        message: 'Missing original filed return for amendment comparison.',
        priority: 'high',
        mapsToSuggestedOnly: true,
      })
    }
  }

  if (profile.answers?.mileage_uncertain === 'yes') {
    items.push({
      kind: 'tax_saving_opportunity',
      id: 'mileage_followup',
      message: 'Business mileage may affect Schedule C / entity deductions — follow up (suggested only).',
      priority: 'low',
      mapsToSuggestedOnly: true,
    })
  }

  return items
}

export function aiAdapterWiredToInterview(): false {
  return false
}
