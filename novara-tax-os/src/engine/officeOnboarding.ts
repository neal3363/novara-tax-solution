/**
 * Tax Office Onboarding Wizard — additive guided setup.
 * Does not activate live e-file/banking. Preserves NOVARA pricing display-only.
 */

import {
  OFFICE_SUBSCRIPTION_BUSINESS,
  OFFICE_SUBSCRIPTION_PERSONAL,
  OFFICE_SUBSCRIPTION_SELF_EMPLOYED,
  formatMoney,
} from '../data/fees'
import type { OfficeStaffMember, UserAccount } from '../data/types'
import { isCredentialVerified, isValidEfinFormat, isValidPtinFormat } from './credentials'
import { listBankProviderConfigs } from './bankProducts'

export type OnboardingStepId =
  | 'registration'
  | 'efin'
  | 'preparers'
  | 'pricing'
  | 'banking'
  | 'readiness'

export interface OfficeOnboardingDraft {
  businessName: string
  contactEmail: string
  phone: string
  addressLine1: string
  city: string
  state: string
  zip: string
  authorizedRep: string
  efinInput: string
  officeServicePersonalFee: number | null
  officeServiceBusinessFee: number | null
  selectedBankProviderId: string | null
  completedSteps: OnboardingStepId[]
  updatedAt: string
}

export interface OnboardingStepStatus {
  id: OnboardingStepId
  title: string
  complete: boolean
  blockers: string[]
  notes: string[]
}

export interface OfficeReadinessReport {
  activationStatus: 'not_ready' | 'ready_sandbox' | 'blocked'
  steps: OnboardingStepStatus[]
  percentComplete: number
  summary: string
}

export function emptyOfficeOnboardingDraft(): OfficeOnboardingDraft {
  return {
    businessName: '',
    contactEmail: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    zip: '',
    authorizedRep: '',
    efinInput: '',
    officeServicePersonalFee: null,
    officeServiceBusinessFee: null,
    selectedBankProviderId: null,
    completedSteps: [],
    updatedAt: new Date().toISOString(),
  }
}

export function evaluateOfficeOnboarding(input: {
  draft: OfficeOnboardingDraft
  owner: UserAccount | null | undefined
  staff: OfficeStaffMember[]
}): OfficeReadinessReport {
  const { draft, owner, staff } = input
  const efin = owner?.credentials?.efin
  const providers = listBankProviderConfigs(owner?.tenantId)

  const steps: OnboardingStepStatus[] = [
    {
      id: 'registration',
      title: 'Office registration',
      complete: Boolean(
        draft.businessName.trim() &&
          draft.authorizedRep.trim() &&
          draft.addressLine1.trim() &&
          draft.city.trim() &&
          draft.state.trim() &&
          draft.zip.trim(),
      ),
      blockers: [],
      notes: ['Business identity for the office workspace (additive profile — does not change pricing).'],
    },
    {
      id: 'efin',
      title: 'EFIN verification',
      complete: Boolean(efin && isCredentialVerified(efin)),
      blockers: [
        ...(draft.efinInput && !isValidEfinFormat(draft.efinInput)
          ? ['EFIN format invalid (expect 6 digits).']
          : []),
        ...(!efin || !isCredentialVerified(efin)
          ? ['EFIN must be submitted and verified before live e-file — lookup remains pending/sandbox.']
          : []),
      ],
      notes: [
        efin
          ? `EFIN on file: status ${efin.status} (fingerprint only).`
          : 'Enter EFIN and complete verification workflow when authorized.',
      ],
    },
    {
      id: 'preparers',
      title: 'Preparer management',
      complete: staff.filter((s) => s.status === 'active').length > 0 || Boolean(owner),
      blockers: staff
        .filter((s) => s.kind === 'preparer' && s.ptinStatus && s.ptinStatus !== 'verified')
        .map((s) => `${s.name}: PTIN not verified`),
      notes: [
        `Active staff: ${staff.filter((s) => s.status === 'active').length}.`,
        'Independent TP accounts cannot add preparers — Office only.',
        'Validate PTIN format when collecting (P + 8 digits).',
      ],
    },
    {
      id: 'pricing',
      title: 'Office pricing display',
      complete: true,
      blockers: [],
      notes: [
        `NOVARA office annual plans: Personal ${formatMoney(OFFICE_SUBSCRIPTION_PERSONAL)}, Self-Employed ${formatMoney(OFFICE_SUBSCRIPTION_SELF_EMPLOYED)}, Business ${formatMoney(OFFICE_SUBSCRIPTION_BUSINESS)}.`,
        `Covered returns: $0 additional NOVARA per-return fee (office-employed preparers included).`,
        draft.officeServicePersonalFee != null
          ? `Office service fee (personal) configured: ${formatMoney(draft.officeServicePersonalFee)} — office charge, not a NOVARA price change.`
          : 'Optional: set office preparation service fees separately from NOVARA platform fees.',
      ],
    },
    {
      id: 'banking',
      title: 'Banking products',
      complete: Boolean(draft.selectedBankProviderId),
      blockers: providers.every((p) => !p.liveConnectivity)
        ? ['No live banking partner — selection is enrollment prep only; products stay offline.']
        : [],
      notes: [
        draft.selectedBankProviderId
          ? `Selected config: ${draft.selectedBankProviderId}`
          : 'Select office-approved or platform-default partner (both offline until verified).',
      ],
    },
    {
      id: 'readiness',
      title: 'Office readiness',
      complete: false,
      blockers: [],
      notes: ['Computed below from all prior steps.'],
    },
  ]

  // Fix registration blockers
  const reg = steps[0]
  if (!draft.businessName.trim()) reg.blockers.push('Business name required')
  if (!draft.authorizedRep.trim()) reg.blockers.push('Authorized representative required')
  if (!draft.addressLine1.trim()) reg.blockers.push('Office address required')

  const prior = steps.filter((s) => s.id !== 'readiness')
  const done = prior.filter((s) => s.complete).length
  const percentComplete = Math.round((done / prior.length) * 100)

  const criticalBlockers = [
    ...steps.find((s) => s.id === 'registration')!.blockers,
    ...steps.find((s) => s.id === 'efin')!.blockers.filter((b) => b.includes('verified')),
  ]

  const readiness = steps.find((s) => s.id === 'readiness')!
  readiness.complete = percentComplete === 100 && criticalBlockers.length === 0
  readiness.blockers = criticalBlockers
  readiness.notes = [
    `Setup ${percentComplete}% complete.`,
    'Sandbox office can operate for demo prep; live e-file/banking stay inactive until credentials and partners verify.',
  ]

  const activationStatus: OfficeReadinessReport['activationStatus'] =
    criticalBlockers.length > 0 ? 'blocked' : percentComplete >= 80 ? 'ready_sandbox' : 'not_ready'

  return {
    activationStatus,
    steps,
    percentComplete,
    summary:
      activationStatus === 'ready_sandbox'
        ? 'Office setup ready for sandbox operations — e-file/banking not live.'
        : activationStatus === 'blocked'
          ? 'Office activation blocked until registration/EFIN requirements are met.'
          : 'Continue the onboarding wizard to finish office setup.',
  }
}

export function assertPtinFormat(value: string): boolean {
  return isValidPtinFormat(value)
}
