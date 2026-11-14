/**
 * Phase 11 — State, business & amended tax returns (isolated staging).
 * STOP before production activation.
 */

export {
  PHASE11_VERSION,
  DEFAULT_PHASE11_FLAGS,
  getPhase11Flags,
  setPhase11FlagsForTests,
  resetPhase11Flags,
  assertNoProductionActivation,
} from './config'
export type { Phase11Flags } from './config'

export type * from './types'

export { computeStateReturn, detectUnsupportedState } from './state/compute'
export {
  getStateTables,
  normalizeStateCode,
  listPrioritizedStates,
  STATE_SUPPORTED_YEARS,
} from './state/tables'
export {
  computeCa540Worksheet,
  computeNyItWorksheet,
  computeIlFlatWorksheet,
} from './state/worksheets'

export { computeForm1065 } from './business/form1065'
export { computeForm1120S } from './business/form1120s'
export { computeForm1120 } from './business/form1120'
export { computeDepreciation } from './business/depreciation'
export { computeEstimatedTax } from './business/estimated'
export { generatePartnershipK1s, generateSCorpK1s } from './business/scheduleK1'

export { prepareAmendedReturn } from './amended/form1040xExtended'
export type { AmendedReturnRequest, AmendedReturnResult } from './amended/form1040xExtended'
export {
  preserveOriginalReturn,
  getPreservedOriginal,
  listAmendmentAudit,
  appendAmendmentAudit,
  resetAmendedStoreForTests,
} from './amended/auditHistory'

export { recognizeInterviewNeeds, aiAdapterWiredToInterview } from './aiAdapter/recognize'
export type { AiAdapterProfileLite, AiRecognitionItem, AiRecognitionKind } from './aiAdapter/recognize'

export { PHASE11_GOLDEN_IDS } from './golden/fixtures'

import { TC_PERSONAL_FEE, TC_BUSINESS_FEE, PRICING } from '../../../data/fees'
import {
  PHASE11_VERSION,
  getPhase11Flags,
  resetPhase11Flags,
  assertNoProductionActivation,
} from './config'
import { resetAmendedStoreForTests } from './amended/auditHistory'
import { listPrioritizedStates } from './state/tables'
import { aiAdapterWiredToInterview } from './aiAdapter/recognize'

export function assertApprovedPricingIntact(): {
  ok: boolean
  tcPersonal: number
  tcBusiness: number
} {
  const ok =
    TC_PERSONAL_FEE === 300 &&
    TC_BUSINESS_FEE === 399 &&
    PRICING.TC.personalReturn === 300 &&
    PRICING.TC.businessReturn === 399 &&
    PRICING.TP.registration === 0 &&
    PRICING.TP.personalReturn === 89 &&
    PRICING.TP.selfEmployedReturn === 119 &&
    PRICING.TP.businessEntityReturn === 249 &&
    PRICING.Office.plans.personal.annual === 899 &&
    PRICING.Office.plans.selfEmployed.annual === 1199 &&
    PRICING.Office.plans.business.annual === 1499
  return { ok, tcPersonal: TC_PERSONAL_FEE, tcBusiness: TC_BUSINESS_FEE }
}

export function resetPhase11ForTests(): void {
  resetPhase11Flags()
  resetAmendedStoreForTests()
}

export function phase11Summary(): string {
  const f = getPhase11Flags()
  const pricing = assertApprovedPricingIntact()
  const states = listPrioritizedStates()
  assertNoProductionActivation()
  return [
    'NOVARA Phase 11 state / business / amended returns (isolated staging)',
    `version=${PHASE11_VERSION}`,
    `states=${states.map((s) => s.code).join(',')}`,
    `nationwideStateFiling=${f.nationwideStateFiling}`,
    `liveBusinessEfile=${f.liveBusinessEfile}`,
    `liveIrsFiling=${f.liveIrsFiling}`,
    `wireAiToInterview=${f.wireAiToInterview}`,
    `aiWired=${aiAdapterWiredToInterview()}`,
    `tcPersonal=${pricing.tcPersonal}`,
    `tcBusiness=${pricing.tcBusiness}`,
    'STOP before production activation.',
  ].join('\n')
}
