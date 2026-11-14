/**
 * Pub 1436–aligned ATS scenario catalog for NOVARA-supported individual returns.
 *
 * Scenario IDs are placeholders for official IRS ATS scenario numbers published
 * each filing season in Publication 1436. Replace with the season's official
 * scenario identifiers once the IRS ATS package for that tax year is released.
 *
 * Internal synthetic returns can be generated offline; official ATS transmission
 * requires Software Developer Test ETIN + Software ID (see officialAtsGate).
 */

export type AtsFormFamily =
  | '1040'
  | '1040_schedules'
  | 'w2'
  | '1099'
  | 'credits'
  | 'direct_deposit'
  | 'balance_due'

export interface AtsScenarioSpec {
  /** Local catalog id (stable in repo) */
  id: string
  /** Official Pub 1436 scenario id when known for the season; null until IRS publishes */
  officialPub1436Id: string | null
  taxYear: number
  formFamily: AtsFormFamily
  title: string
  objective: string
  requiredForms: string[]
  syntheticFixtureHint: string
  status: 'catalogued' | 'synthetic_ready' | 'awaiting_official_irs_ats' | 'official_pass_recorded'
}

export const SUPPORTED_ATS_TAX_YEAR = 2025

/** Minimum scenario set NOVARA must cover for Form 1040 MeF Software Developer testing. */
export function individualAtsScenarioCatalog(taxYear = SUPPORTED_ATS_TAX_YEAR): AtsScenarioSpec[] {
  return [
    {
      id: `ty${taxYear}-1040-basic-single`,
      officialPub1436Id: null,
      taxYear,
      formFamily: '1040',
      title: 'Basic Form 1040 single filer',
      objective: 'Validate schema + business rules for standard single return',
      requiredForms: ['Form1040'],
      syntheticFixtureHint: 'synthetic_1040_single_w2',
      status: 'catalogued',
    },
    {
      id: `ty${taxYear}-1040-mfj-dependents`,
      officialPub1436Id: null,
      taxYear,
      formFamily: '1040',
      title: 'MFJ with dependents',
      objective: 'Dependents, CTC/ODC path validation',
      requiredForms: ['Form1040', 'Schedule8812'],
      syntheticFixtureHint: 'synthetic_1040_mfj_dependents',
      status: 'catalogued',
    },
    {
      id: `ty${taxYear}-sch-c-se`,
      officialPub1436Id: null,
      taxYear,
      formFamily: '1040_schedules',
      title: 'Schedule C / SE self-employment',
      objective: 'Business income + SE tax linkage',
      requiredForms: ['Form1040', 'ScheduleC', 'ScheduleSE'],
      syntheticFixtureHint: 'synthetic_1040_sch_c',
      status: 'catalogued',
    },
    {
      id: `ty${taxYear}-w2-1099-mix`,
      officialPub1436Id: null,
      taxYear,
      formFamily: 'w2',
      title: 'W-2 and 1099 income mix',
      objective: 'Wage + nonemployee compensation attachments',
      requiredForms: ['Form1040', 'IRSW2', 'IRS1099NEC'],
      syntheticFixtureHint: 'synthetic_w2_1099_mix',
      status: 'catalogued',
    },
    {
      id: `ty${taxYear}-credits-eic`,
      officialPub1436Id: null,
      taxYear,
      formFamily: 'credits',
      title: 'Refundable credit path (EITC)',
      objective: 'Credit eligibility schema + BR validation',
      requiredForms: ['Form1040', 'ScheduleEIC'],
      syntheticFixtureHint: 'synthetic_eitc',
      status: 'catalogued',
    },
    {
      id: `ty${taxYear}-refund-dd`,
      officialPub1436Id: null,
      taxYear,
      formFamily: 'direct_deposit',
      title: 'Refund direct deposit',
      objective: 'Banking fields / Form 8888 when applicable',
      requiredForms: ['Form1040'],
      syntheticFixtureHint: 'synthetic_refund_dd',
      status: 'catalogued',
    },
    {
      id: `ty${taxYear}-balance-due`,
      officialPub1436Id: null,
      taxYear,
      formFamily: 'balance_due',
      title: 'Balance due return',
      objective: 'Amount owed path without refund settlement',
      requiredForms: ['Form1040'],
      syntheticFixtureHint: 'synthetic_balance_due',
      status: 'catalogued',
    },
  ]
}

export function scenariosAwaitingOfficialIrsIds(taxYear = SUPPORTED_ATS_TAX_YEAR): AtsScenarioSpec[] {
  return individualAtsScenarioCatalog(taxYear).filter((s) => s.officialPub1436Id === null)
}

export function markScenarioOfficialPass(
  catalog: AtsScenarioSpec[],
  scenarioId: string,
  officialPub1436Id: string,
): AtsScenarioSpec[] {
  return catalog.map((s) =>
    s.id === scenarioId
      ? {
          ...s,
          officialPub1436Id,
          status: 'official_pass_recorded' as const,
        }
      : s,
  )
}

/** Explicit disclaimer for reports / UI. */
export const ATS_DISCLAIMER =
  'Internal mock MeF acknowledgments are NOT official IRS ATS approval. Official ATS requires Software Developer Test ETIN, Software ID, Pub 1436 scenarios, and IRS-issued acceptances.'
