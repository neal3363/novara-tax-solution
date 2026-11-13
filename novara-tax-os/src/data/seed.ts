/**
 * Production-safe seed helpers.
 * Multi-tenant demo rosters live in /dev-fixtures (outside the published app tree)
 * and load only under import.meta.env.DEV via the @dev-fixtures alias.
 */
import type { DocumentRecord, TaxReturn, UserAccount } from './types'
import { TC_PERSONAL_FEE } from './fees'
import { vaultStoragePath } from '../engine/tenantIsolation'
import { resolveFilingSeason } from '../engine/taxYearCatalog'

export const SMART_QUESTIONS = [
  { id: 'q1', prompt: 'Did you move to a different state during this tax year?' },
  { id: 'q2', prompt: 'Do you want to contribute to an IRA or retirement account for this tax year?' },
  { id: 'q3', prompt: 'Did anyone else claim you as a dependent?' },
]

/** Build an isolated TC workspace for the verified Cursor viewer — no other tenants. */
export function buildViewerWorkspace(viewer: {
  sub: string
  name: string
  email: string
  /** Server-assigned only; non-taxpayer values are ignored in production workspaces. */
  role?: UserAccount['role']
  accountType?: UserAccount['accountType']
}): { user: UserAccount; returns: TaxReturn[]; documents: DocumentRecord[] } {
  const season = resolveFilingSeason()
  const tenantId = `tenant-viewer-${viewer.sub.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'owner'}`
  const userId = `u-${viewer.sub.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'owner'}`
  const displayName = viewer.name?.trim() || viewer.email?.split('@')[0] || 'Taxpayer'
  // Published app never elevates: only taxpayer/tc workspaces are built from identity.
  const role = viewer.role === 'taxpayer' ? 'taxpayer' : 'taxpayer'
  const accountType = viewer.accountType === 'tc' ? 'tc' : 'tc'
  const user: UserAccount = {
    id: userId,
    name: displayName,
    email: viewer.email || `${userId}@novara.local`,
    role,
    tenantId,
    accountType,
  }
  const returnId = `r-${userId}-ty${season.currentTaxYear}`
  const returns: TaxReturn[] = [
    {
      id: returnId,
      clientName: displayName,
      clientId: userId,
      taxYear: season.currentTaxYear,
      returnType: '1040',
      state: 'Client Created',
      readiness: 5,
      refundOrOwe: 0,
      tenantId,
      isBusiness: false,
      feeSnapshot: [{ label: 'Personal tax return (TC)', amount: TC_PERSONAL_FEE, status: 'quoted' }],
      appliedBenefits: [],
      updatedAt: new Date().toISOString(),
    },
  ]
  const documents: DocumentRecord[] = []
  void vaultStoragePath
  return { user, returns, documents }
}

/** Empty production bootstrap — filled only after verified session. */
export const EMPTY_RETURNS: TaxReturn[] = []
export const EMPTY_DOCS: DocumentRecord[] = []
