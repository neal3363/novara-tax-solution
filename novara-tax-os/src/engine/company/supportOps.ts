/**
 * Customer support & software maintenance ops scaffold.
 * Does not activate a live helpdesk — EXT-SUPPORT remains blocked.
 */

export type SupportChannel = 'email' | 'ticket' | 'phone' | 'in_app'

export interface SupportOpsPlan {
  channelsPlanned: SupportChannel[]
  filingSeasonStaffingRequired: boolean
  liveHelpdeskEnabled: false
  draftHelpPageExists: true
  escalationRoles: string[]
  maintenanceWindows: string
}

export function defaultSupportOpsPlan(): SupportOpsPlan {
  return {
    channelsPlanned: ['email', 'ticket', 'in_app'],
    filingSeasonStaffingRequired: true,
    liveHelpdeskEnabled: false,
    draftHelpPageExists: true,
    escalationRoles: ['L1_support', 'L2_tax_ops', 'engineering_oncall', 'owner'],
    maintenanceWindows: 'Off-peak UTC with owner-approved change window',
  }
}

export interface TaxYearUpdateProgram {
  annualSchemaRefresh: boolean
  federalTableUpdates: boolean
  stateTableUpdates: boolean
  atsRetestEachSeason: boolean
  ownerApprovalBeforeSeasonGoLive: boolean
}

export function taxYearUpdateProgram(): TaxYearUpdateProgram {
  return {
    annualSchemaRefresh: true,
    federalTableUpdates: true,
    stateTableUpdates: true,
    atsRetestEachSeason: true,
    ownerApprovalBeforeSeasonGoLive: true,
  }
}

export const SUPPORT_OPS_DISCLAIMER =
  'Draft Help UI is not a staffed production support organization. EXT-SUPPORT must be evidenced before claiming production customer service.'
