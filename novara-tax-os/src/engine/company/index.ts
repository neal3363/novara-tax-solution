/**
 * Independent tax software company operating model.
 * STOP: not a reseller / franchise / dependent frontend.
 */

export {
  COMPANY_CHARTER_VERSION,
  REQUIRED_OPERATING_MODEL,
  FORBIDDEN_OPERATING_MODELS,
  companyIndependenceStatement,
  assertIndependentOperatingModel,
  independentCompanyPillars,
  pillarsBlockingLiveCompanyLaunch,
  assertNotResellerOrWhiteLabel,
} from './independenceCharter'
export type {
  OperatingModel,
  CompanyPillarId,
  PillarStatus,
  CompanyPillar,
} from './independenceCharter'

export {
  commercialSoftwareSkuCatalog,
  officeCoveredReturnSoftwareFeeUsd,
  assertCommercialPricingMatchesFees,
  COMMERCIAL_POSITIONING,
} from './commercialLicense'
export type { LicenseAudience, EntitlementKind, CommercialSku } from './commercialLicense'

export {
  priorityStateFilingRequirements,
  expansionStateEfilePlaceholders,
  federalFilingRequirements,
  statesRequiringEfileApprovalBeforeLive,
  STATE_EFILE_DISCLAIMER,
} from './stateEfileMatrix'
export type { StateEfileStatus, StateFilingRequirement } from './stateEfileMatrix'

export {
  businessRegistrationChecklist,
  thirdPartyAgreementsRequired,
} from './businessRegistrations'
export type { RegistrationOwner, RegistrationItem } from './businessRegistrations'

export {
  defaultSupportOpsPlan,
  taxYearUpdateProgram,
  SUPPORT_OPS_DISCLAIMER,
} from './supportOps'
export type { SupportChannel, SupportOpsPlan, TaxYearUpdateProgram } from './supportOps'

export {
  mobileDistributionChecklist,
  mobileBlocksNationalClaim,
} from './mobileLaunch'
export type { MobilePlatform, MobileLaunchItem } from './mobileLaunch'

import { COMPANY_CHARTER_VERSION, companyIndependenceStatement, independentCompanyPillars } from './independenceCharter'
import { assertCommercialPricingMatchesFees, COMMERCIAL_POSITIONING } from './commercialLicense'
import { federalFilingRequirements, statesRequiringEfileApprovalBeforeLive } from './stateEfileMatrix'
import { businessRegistrationChecklist } from './businessRegistrations'

export function companyIndependenceSummary(): string {
  const pricing = assertCommercialPricingMatchesFees()
  const pillars = independentCompanyPillars()
  const blockedRegs = businessRegistrationChecklist().filter((r) => r.blocksLiveLaunch)
  return [
    'NOVARA Independent Tax Software Company',
    `version=${COMPANY_CHARTER_VERSION}`,
    companyIndependenceStatement(),
    `positioning=${COMMERCIAL_POSITIONING.softwareLicensor};franchise=${COMMERCIAL_POSITIONING.isFranchise};whiteLabel=${COMMERCIAL_POSITIONING.isWhiteLabelReseller}`,
    `pillars=${pillars.length};pricingOk=${pricing.ok}`,
    `federalBlocks=${federalFilingRequirements().filter((f) => f.status === 'blocked').length}`,
    `statesNeedingEfileApproval=${statesRequiringEfileApprovalBeforeLive().length}`,
    `registrationsBlockingLaunch=${blockedRegs.length}`,
    'STOP before live MeF, live payments, nationwide state e-file, or production publish without owner authorization.',
  ].join('\n')
}
