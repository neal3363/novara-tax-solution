/**
 * Server/test-only public demo safety lock verification.
 * Do not import from React UI bundles (pulls excluded staging engines).
 */

import { TC_PERSONAL_FEE, TC_BUSINESS_FEE, PRIOR_YEAR_SURCHARGE, PRICING } from '../../data/fees'
import { cutoverReady, mayShowIrsToTaxpayer } from '../irs'
import { getMefFlags } from '../irs/mef'
import { getPhase10Flags } from '../payments/phase10'
import { getPhase11Flags } from '../returns/phase11'
import { getPhase12Flags } from '../launch/phase12'
import { getRemediationFlags } from './config'
import { isPublicDemoMode, PUBLIC_DEMO_BANNER, PUBLIC_DEMO_RESULT_LABEL } from '../demo/publicDemo'

export function assertDemoSafetyLocks(): {
  ok: boolean
  pricingOk: boolean
  locks: Record<string, boolean | string | number>
  failures: string[]
} {
  const failures: string[] = []
  const mef = getMefFlags()
  const p10 = getPhase10Flags()
  const p11 = getPhase11Flags()
  const p12 = getPhase12Flags()
  const rem = getRemediationFlags()

  const pricingOk =
    TC_PERSONAL_FEE === 300 &&
    TC_BUSINESS_FEE === 399 &&
    PRIOR_YEAR_SURCHARGE === 250 &&
    PRICING.TC.personalReturn === 300 &&
    PRICING.TC.businessReturn === 399

  if (!pricingOk) failures.push('pricing_drift')
  if (cutoverReady()) failures.push('irs_cutover_on')
  if (mayShowIrsToTaxpayer()) failures.push('irs_taxpayer_visible')
  if (mef.liveProductionTransmit) failures.push('mef_live')
  if (p10.livePayments) failures.push('live_payments')
  if (p10.liveBankingPartner) failures.push('live_banking')
  if (p11.nationwideStateFiling) failures.push('nationwide_state')
  if (p11.liveBusinessEfile) failures.push('business_efile')
  if (p12.processRealTaxpayerReturns) failures.push('real_taxpayer_processing')
  if (p12.liveIrsFiling) failures.push('phase12_live_irs')
  if (rem.productionEnforcement) failures.push('production_enforcement')
  if (rem.liveIrsFiling || rem.livePayments || rem.liveBankingPartner) failures.push('remediation_live')

  return {
    ok: failures.length === 0,
    pricingOk,
    locks: {
      publicDemo: isPublicDemoMode(),
      cutoverReady: cutoverReady(),
      mayShowIrsToTaxpayer: mayShowIrsToTaxpayer(),
      liveProductionTransmit: mef.liveProductionTransmit,
      livePayments: p10.livePayments,
      liveBankingPartner: p10.liveBankingPartner,
      nationwideStateFiling: p11.nationwideStateFiling,
      liveBusinessEfile: p11.liveBusinessEfile,
      processRealTaxpayerReturns: p12.processRealTaxpayerReturns,
      productionEnforcement: rem.productionEnforcement,
      tcPersonal: TC_PERSONAL_FEE,
      tcBusiness: TC_BUSINESS_FEE,
    },
    failures,
  }
}

export function publicDemoStatusPayload() {
  const safety = assertDemoSafetyLocks()
  return {
    mode: 'public_demo_synthetic' as const,
    banner: PUBLIC_DEMO_BANNER,
    resultLabel: PUBLIC_DEMO_RESULT_LABEL,
    acceptRealTaxpayers: false as const,
    liveIrsFiling: false as const,
    livePayments: false as const,
    liveBanking: false as const,
    dnsPublished: false as const,
    ownerApprovalRequiredForPublicDns: true as const,
    safety,
    pricing: {
      tcPersonal: TC_PERSONAL_FEE,
      tcBusiness: TC_BUSINESS_FEE,
      priorYearSurcharge: PRIOR_YEAR_SURCHARGE,
    },
  }
}
