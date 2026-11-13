/**
 * Office return-status dashboard mapping.
 * Does not invent IRS acceptance — uses return state + QA flags only.
 */

import type { TaxReturn } from '../data/types'

export const OFFICE_PIPELINE_STATUSES = [
  'New Client',
  'Documents Requested',
  'Waiting on Client',
  'Documents Received',
  'AI Processing',
  'Questions Outstanding',
  'Preparing Return',
  'Quality Review Required',
  'Ready for Client Approval',
  'Awaiting Signature',
  'Ready to File',
  'Submitted',
  'IRS Accepted',
  'IRS Rejected',
  'Correction Required',
  'Completed',
] as const

export type OfficePipelineStatus = (typeof OFFICE_PIPELINE_STATUSES)[number]

export function mapReturnToOfficeStatus(
  r: TaxReturn,
  opts?: { hasInvitePending?: boolean; qaCritical?: boolean; questionsOpen?: boolean },
): OfficePipelineStatus {
  if (r.state === 'Accepted') return 'IRS Accepted'
  if (r.state === 'Rejected') return 'IRS Rejected'
  if (r.state === 'Transmitted') return 'Submitted'
  if (r.state === 'Closed' || r.state === 'Post-Filing') return 'Completed'
  if (r.state === 'Ready to File') return opts?.qaCritical ? 'Quality Review Required' : 'Ready to File'
  if (r.state === 'Signature Pending') return 'Awaiting Signature'
  if (r.state === 'Client Review') return 'Ready for Client Approval'
  if (r.state === 'Preparer Review' || r.state === 'Expert Review') {
    return opts?.qaCritical ? 'Quality Review Required' : 'Preparing Return'
  }
  if (r.state === 'Diagnostics' || r.state === 'Calculation') return 'AI Processing'
  if (r.state === 'Extraction/Verification' || r.state === 'Tax Facts Ready') return 'Documents Received'
  if (r.state === 'Documents Pending') {
    return opts?.hasInvitePending ? 'Documents Requested' : 'Waiting on Client'
  }
  if (r.state === 'Intake Started' || r.state === 'Engagement Accepted') {
    return opts?.questionsOpen ? 'Questions Outstanding' : 'Preparing Return'
  }
  if (r.state === 'Lead' || r.state === 'Client Created') return 'New Client'
  if (opts?.questionsOpen) return 'Questions Outstanding'
  return 'Preparing Return'
}

export function officeDashboardMetrics(returns: TaxReturn[]) {
  const statuses = returns.map((r) => mapReturnToOfficeStatus(r))
  const count = (s: OfficePipelineStatus) => statuses.filter((x) => x === s).length
  const revenue = returns.reduce((sum, r) => sum + r.feeSnapshot.reduce((a, f) => a + f.amount, 0), 0)
  return {
    totalActive: returns.filter((r) => !['Closed', 'Accepted', 'Post-Filing'].includes(r.state)).length,
    inProgress: returns.filter((r) => !['Accepted', 'Rejected', 'Closed', 'Transmitted'].includes(r.state)).length,
    waitingOnClients: count('Waiting on Client') + count('Documents Requested'),
    readyToFile: count('Ready to File'),
    accepted: count('IRS Accepted'),
    rejected: count('IRS Rejected'),
    outstandingSignatures: count('Awaiting Signature'),
    estimatedRevenue: revenue,
  }
}
