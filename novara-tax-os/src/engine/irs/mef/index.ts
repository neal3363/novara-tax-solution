/**
 * Phase 8 — Isolated IRS MeF electronic filing package.
 * Dev/test only. STOP before production IRS transmission.
 * Do not import into homepage, Maximizer, or production security enforcement.
 */

export {
  PHASE8_MEF_VERSION,
  DEFAULT_PHASE8_MEF_FLAGS,
  getMefFlags,
  setMefFlagsForTests,
  resetMefFlags,
  assertNoLiveIrsTransmit,
  activeMefEnvironment,
} from './config'
export type { Phase8MefFlags, MefEnvironment } from './config'

export type {
  MefFilingStatus,
  MefAckSource,
  MefReturnType,
  MefSyntheticReturn,
  MefXmlDocument,
  MefValidationIssue,
  MefValidationResult,
  MefProviderReadiness,
  Mef8879Authorization,
  MefSubmissionRecord,
  MefAcknowledgment,
  MefTransmitResult,
} from './types'

export {
  SUPPORTED_MEF_TAX_YEARS,
  SUPPORTED_RETURN_TYPES,
  SUPPORTED_SCHEDULES,
  UNSUPPORTED_FORMS,
  efileSchemaVersion,
  isSupportedTaxYear,
  isSupportedReturnType,
  findUnsupportedForms,
} from './schema/stubs'

export { composeReturnXml } from './xml/compose'
export { validateReturnPayload, validateComposedXml, corruptXmlForTests } from './xml/validate'

export { REJECT_CODE_CATALOG, interpretRejectCodes } from './ack/rejectCodes'
export { parseAcknowledgment, filingStatusFromAck, buildMockAckXml } from './ack/parseAck'

export {
  MEF_FILING_STATUS_LABELS,
  describeFilingStatus,
  canTransmitFromStatus,
  nextStatusAfterTransmit,
  statusAfterRejection,
} from './status'

export { evaluateProviderReadiness, formatCheckOnly } from './credentials/efinGate'
export type { MefCredentialBundle } from './credentials/efinGate'

export { evaluate8879Authorization, assertAuthorizedToTransmit } from './form8879/bridge'

export {
  appendMefLog,
  listMefLog,
  mefLogLength,
  resetMefLogForTests,
} from './logging'
export type { MefLogAction, MefSecureLogEntry } from './logging'

export {
  resetTransmitterForTests,
  setTransmitterMode,
  getTransmitterMode,
  sandboxTransmit,
  findDuplicateSubmission,
} from './transmitter/sandboxAdapter'

export {
  resetMefPipelineForTests,
  listSubmissions,
  getSubmission,
  createDraftSubmission,
  setSubmissionStatus,
  prepareForTransmission,
  transmitPrepared,
  resubmitCorrection,
  mefPackageSummary,
} from './pipeline'

export {
  OFFICIAL_IRS_EFILE_LINKS,
  recommendedNovaraProviderRoles,
  ownerEservicesApplicationChecklist,
  identifiersRequiredForNovaraModel,
} from './authorization/irsProviderRoles'
export type {
  OfficialIrsLink,
  NovaraProviderRolePlan,
  OwnerEservicesChecklistItem,
  IrsProviderOption,
} from './authorization/irsProviderRoles'

export {
  evaluateOfficialAtsReadiness,
  assertNotMockAsOfficialAts,
  officialAtsFromProviderBundle,
} from './ats/officialAtsGate'
export type { AtsChannel, OfficialAtsReadiness, OfficialAtsCredentials } from './ats/officialAtsGate'

export {
  individualAtsScenarioCatalog,
  scenariosAwaitingOfficialIrsIds,
  markScenarioOfficialPass,
  ATS_DISCLAIMER,
  SUPPORTED_ATS_TAX_YEAR,
} from './ats/scenarioCatalog'
export type { AtsFormFamily, AtsScenarioSpec } from './ats/scenarioCatalog'

export {
  buildSyntheticReturnForScenario,
  buildAllSyntheticAtsPacks,
} from './ats/syntheticTestReturns'
export type { SyntheticAtsReturn } from './ats/syntheticTestReturns'
