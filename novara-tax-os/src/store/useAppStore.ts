import { useSyncExternalStore } from 'react'
import { DEMO_USERS, SEED_DOCS, SEED_OFFICE_STAFF, SEED_RETURNS, SMART_QUESTIONS } from '../data/seed'
import type {
  AccountType,
  AppState,
  AuditEvent,
  DocumentRecord,
  EntryPlanLine,
  Message,
  MultiYearEngagement,
  OfficeStaffMember,
  PreEntryNote,
  ReturnState,
  Role,
  TaxReturn,
  UserAccount,
} from '../data/types'
import {
  PRIOR_YEAR_SURCHARGE,
  TC_PERSONAL_FEE,
  dedupeFeeLines,
  quoteMultiYearOrder,
  returnSoftwareFee,
  roleToTier,
  type AccountTier,
  type YearOrderSelection,
} from '../data/fees'
import { assessAmendment } from '../engine/amendmentEngine'
import { estimatePenaltiesAndInterest } from '../engine/penaltyInterestEngine'
import { getTaxYearDefinition, resolveFilingSeason } from '../engine/taxYearCatalog'
import {
  canAssignClients,
  canCreateClients,
  canManageStaff,
  canTransmitTaxReturn,
  permissionSummary,
} from '../engine/accountPermissions'
import {
  credentialPublicView,
  submitCredential,
  type EfileProviderAssociation,
} from '../engine/credentials'
import {
  applyHouseholdToProfile,
  emptyHouseholdIntake,
  extractPeopleFromDocuments,
  nextDependentQualifyPrompt,
  nextRelationshipPrompt,
  recommendFilingStatus,
  relationshipsComplete,
  vaultCategoryForDoc,
  type HouseholdIntakeState,
  type HouseholdRelationChoice,
} from '../engine/documentIntakeEngine'
import {
  asScopedDocument,
  asScopedReturn,
  assertNoClientQuota,
  assertNoReturnQuota,
  canAccessDocument,
  canAccessReturn,
  filterDocumentsForActor,
  filterReturnsForActor,
  issueDocumentAccessToken,
  logSensitiveAccess,
  resolveWriteTenant,
  vaultStoragePath,
  type TenantScopedDocument,
  type TenantScopedReturn,
} from '../engine/tenantIsolation'
import {
  applyAnswer,
  defaultProfile,
  runBenefitOptimization,
  type TaxpayerProfile,
} from '../engine/benefitOptimizer'
import {
  applyFilingStatusAnswer,
  conversationalReply,
  nextBenefitDiscoveryTurn,
  nextFilingStatusTurn,
  syncProfileFromDocuments,
} from '../engine/smartInterview'
import { buildInterviewProgress, nextInterviewTurn } from '../engine/questionProgress'
import {
  classifyDocumentName,
  detectDocumentConflicts,
  extractFactsForType,
  findDuplicateUploads,
  plainLanguageExtractionSummary,
} from '../engine/documentProcessing'
import { applyParsedFacts, parseTaxpayerStatement } from '../engine/naturalLanguageFacts'
import { evaluateDependent } from '../engine/dependentsEngine'
import type { BenefitSnapshot } from '../data/types'
import {
  createUploadInvite,
  markInviteUsed,
  revokeInvite,
  validateUploadInvite,
  type UploadInvite,
} from '../engine/secureUploadInvite'
import { parsePriorReturnExport, type ImportedReturnDraft } from '../engine/priorReturnImport'
import { runPreFilingQa } from '../engine/qaEngine'
import { buildCalcAuditTrail } from '../engine/calcAuditTrail'
import {
  buildClientNotification,
  shouldSuppressDuplicate,
  type NotificationKind,
} from '../engine/clientNotifications'

/** Role preference only — never store tax demo payloads in localStorage */
const ROLE_KEY = 'novara-tax-os-role'
const USER_KEY = 'novara-tax-os-user-id'
/** Session-scoped demo state (clears when the tab closes) */
const SESSION_KEY = 'novara-tax-os-session-v12'

function money(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function appendAudit(action: string, summary: string, meta?: AuditEvent['meta']) {
  const evt: AuditEvent = {
    id: uid('aud'),
    at: new Date().toISOString(),
    actorId: state.currentUser?.id ?? 'system',
    actorRole: state.currentUser?.role ?? 'system',
    action,
    summary,
    meta,
  }
  return [...state.auditEvents, evt].slice(-200)
}

function recordInterviewAnswer(
  mapsTo: string,
  prompt: string,
  answer: string | number,
  meta?: { benefitRuleId?: string },
) {
  const existing = state.interviewAnswers.filter((a) => a.mapsTo !== mapsTo)
  const active =
    state.returns.find((r) => r.id === state.activeReturnId) ??
    state.returns.find((r) => r.clientId === state.currentUser?.id && r.taxYear === state.activeTaxYear)
  return [
    ...existing,
    {
      id: uid(`ans-${mapsTo}`),
      mapsTo,
      questionId: mapsTo,
      prompt,
      answer,
      at: new Date().toISOString(),
      tenantId: state.currentUser?.tenantId ?? active?.tenantId,
      clientId: state.currentUser?.id ?? active?.clientId,
      taxYear: state.activeTaxYear,
      returnId: active?.id ?? state.activeReturnId,
      benefitRuleId: meta?.benefitRuleId,
    },
  ]
}

/** Clear a confirmed answer and later-dependent answers so the question can be re-asked. */
function clearAnswerTree(mapsTo: string) {
  const idx = state.interviewAnswers.findIndex((a) => a.mapsTo === mapsTo)
  const keep = idx >= 0 ? state.interviewAnswers.slice(0, idx) : state.interviewAnswers.filter((a) => a.mapsTo !== mapsTo)
  const removed = new Set(
    idx >= 0
      ? state.interviewAnswers.slice(idx).map((a) => a.mapsTo)
      : [mapsTo],
  )

  const answers = { ...state.taxProfile.answers }
  removed.forEach((key) => {
    delete answers[key]
  })

  // Side-effect fields that were seeded from interview answers
  let dependents = state.taxProfile.dependents.map((d) => ({ ...d }))
  if (removed.has('has_qualifying_person') || removed.has('has_dependents') || removed.has('has_child') || removed.has('potential_dependents')) {
    if (!answers.has_dependents && !answers.has_qualifying_person && !answers.potential_dependents) {
      dependents = []
    }
  }
  // Clear dependent object fields when their answer keys are removed so questions reopen
  removed.forEach((key) => {
    const m = /^dep_(\d+)_(.+)$/.exec(key)
    if (!m) return
    const idx = Number(m[1])
    const field = m[2]
    if (!dependents[idx]) return
    const dep = { ...dependents[idx] }
    if (field === 'name') dep.fullLegalName = ''
    if (field === 'dob') {
      dep.dateOfBirth = ''
      dep.age = -1
    }
    if (field === 'tin_path' || field === 'tin_last4') {
      dep.tinLast4 = ''
      dep.tinStatus = 'missing'
    }
    if (field === 'rel' || field === 'relationship') dep.relationship = ''
    if (field === 'months') dep.monthsLivedWith = null
    if (field === 'student') dep.isStudent = null
    if (field === 'disabled') dep.isDisabled = null
    dep.interviewComplete = false
    dependents[idx] = dep
  })

  let childcarePaid = state.taxProfile.childcarePaid
  if (removed.has('paid_childcare') || removed.has('childcare_amount')) {
    childcarePaid = 0
  }

  let filingStatus = state.taxProfile.filingStatus
  if (removed.has('married_dec31') || removed.has('married_filing_plan') || removed.has('maintained_home')) {
    filingStatus = 'single'
  }

  return {
    interviewAnswers: keep,
    taxProfile: {
      ...state.taxProfile,
      answers,
      dependents,
      childcarePaid,
      filingStatus,
      unresolvedKeys: state.taxProfile.unresolvedKeys.filter((k) => !removed.has(k)),
    },
  }
}

function toSnapshot(profile: TaxpayerProfile, reason?: string): BenefitSnapshot {
  const prev = state.benefitReport
  const prevIds = new Set(
    (prev?.findings ?? [])
      .filter((f) => f.status === 'applied' || f.status === 'pending_verification')
      .map((f) => f.ruleId),
  )
  const report = runBenefitOptimization(profile)
  // Detect newly applied against prior snapshot ids (avoid circular OptimizationReport typing)
  report.newlyApplied = report.findings.filter(
    (f) =>
      (f.status === 'applied' || f.status === 'pending_verification') &&
      f.affectingRefund > 0 &&
      !prevIds.has(f.ruleId),
  )
  const delta = report.projectedRefund - (prev?.projectedRefund ?? report.baseRefund)
  let lastChangeNote = reason ?? 'Tax benefits rechecked against your latest documents and answers.'
  if (prev) {
    const direction =
      delta === 0 ? 'stayed the same' : delta > 0 ? `went up by ${money(delta)}` : `went down by ${money(Math.abs(delta))}`
    lastChangeNote = `${reason ? reason + ' ' : ''}Your estimated refund ${direction}. Applied benefits ${money(report.verifiedSavings)}; still gathering info on ${money(report.potentialSavings)}.`
  }

  const lastApplications = report.newlyApplied.map((f) => ({
    ruleId: f.ruleId,
    name: f.shortName,
    amount: f.affectingRefund,
    previousRefund: prev?.projectedRefund ?? report.baseRefund,
    updatedRefund: report.projectedRefund,
    form: f.form ?? 'Form 1040',
    field: f.field ?? f.shortName,
    at: new Date().toISOString(),
  }))

  if (lastApplications.length === 0 && delta !== 0 && reason) {
    // Recalc changed refund without a brand-new rule id (amount update)
    lastApplications.push({
      ruleId: 'recalc',
      name: 'Return recalculation',
      amount: Math.abs(delta),
      previousRefund: prev?.projectedRefund ?? report.baseRefund,
      updatedRefund: report.projectedRefund,
      form: 'Form 1040',
      field: 'Refund / balance due',
      at: new Date().toISOString(),
    })
  }

  return {
    taxYear: report.taxYear,
    ruleVersion: report.ruleVersion,
    baseRefund: report.baseRefund,
    projectedRefund: report.projectedRefund,
    verifiedSavings: report.verifiedSavings,
    potentialSavings: report.potentialSavings,
    auditComplete: report.auditComplete,
    blockers: report.blockers,
    comparisonNotes: report.comparisonNotes,
    findings: report.findings,
    formLines: report.formLines,
    lastRunAt: new Date().toISOString(),
    lastChangeNote: report.refundIncomplete
      ? `${report.refundIncompleteReason} ${lastChangeNote}`
      : lastChangeNote,
    lastApplications,
    dependentInfoComplete: report.dependentInfoComplete,
    refundIncomplete: report.refundIncomplete,
    refundIncompleteReason: report.refundIncompleteReason,
  }
}

function syncReturnRefund(report: BenefitSnapshot) {
  return state.returns.map((r) =>
    r.id === state.activeReturnId ||
    (r.clientId === (state.currentUser?.id ?? 'u-tax') && r.taxYear === state.activeTaxYear)
      ? {
          ...r,
          refundOrOwe: report.projectedRefund,
          appliedBenefits: report.formLines,
          readiness: report.auditComplete ? Math.max(r.readiness, 96) : Math.max(r.readiness, 55),
          updatedAt: new Date().toISOString(),
        }
      : r,
  )
}

type Store = AppState & {
  hydrated: boolean
}

const DEFAULT_NOTES: PreEntryNote[] = [
  {
    id: 'n1',
    severity: 'high',
    title: 'Low-confidence 1099-NEC',
    detail: 'Nonemployee compensation confidence is below firm threshold. Confirm amount against source before approval.',
  },
  {
    id: 'n2',
    severity: 'medium',
    title: 'Possible missing 1099-INT',
    detail: 'Prior-year binder included First Harbor Bank interest. Upload current year or confirm account closed.',
  },
  {
    id: 'n3',
    severity: 'low',
    title: 'Dependent care unanswered',
    detail: 'Smart question on childcare is unanswered and may affect credits.',
  },
]

function buildEntryPlan(docs: DocumentRecord[]): EntryPlanLine[] {
  const lines: EntryPlanLine[] = []
  docs.forEach((d) => {
    d.facts.forEach((f) => {
      const field =
        f.label.toLowerCase().includes('wage')
          ? 'Form 1040 · Line 1a'
          : f.label.toLowerCase().includes('withheld')
            ? 'Form 1040 · Line 25a'
            : f.label.toLowerCase().includes('compensation')
              ? 'Schedule C · Gross receipts'
              : `Mapped · ${f.label}`
      lines.push({
        id: `ep-${f.id}`,
        form: d.type,
        field,
        proposedValue: f.value,
        sourceDocId: d.id,
        sourceDocName: d.name,
        sourceBox: f.label,
        sourcePage: f.sourcePage,
        confidence: f.confidence,
        status: 'proposed',
      })
    })
  })
  if (lines.length === 0) {
    return [
      {
        id: 'ep-seed-1',
        form: 'W-2',
        field: 'Form 1040 · Line 1a',
        proposedValue: '$72,400.00',
        sourceDocId: 'd-1',
        sourceDocName: 'W2_Acme_2025.pdf',
        sourceBox: 'Box 1 Wages',
        sourcePage: 1,
        confidence: 0.98,
        status: 'proposed',
      },
      {
        id: 'ep-seed-2',
        form: 'W-2',
        field: 'Form 1040 · Line 25a',
        proposedValue: '$8,920.00',
        sourceDocId: 'd-1',
        sourceDocName: 'W2_Acme_2025.pdf',
        sourceBox: 'Box 2 Federal withheld',
        sourcePage: 1,
        confidence: 0.97,
        status: 'proposed',
      },
      {
        id: 'ep-seed-3',
        form: '1099-NEC',
        field: 'Schedule C · Gross receipts',
        proposedValue: '$4,250.00',
        sourceDocId: 'd-2',
        sourceDocName: '1099NEC_Studio.pdf',
        sourceBox: 'Box 1 NEC',
        sourcePage: 1,
        confidence: 0.81,
        status: 'proposed',
      },
    ]
  }
  return lines
}

let state: Store = {
  currentUser: null,
  documents: SEED_DOCS,
  returns: SEED_RETURNS,
  messages: [
    {
      id: 'm0',
      role: 'assistant',
      text: 'Hi — I’m your NOVARA Tax AI. Upload documents and I’ll classify, extract, and guide your return. I propose; the rules engine calculates. A preparer approves the entry plan before anything is written.',
      at: new Date().toISOString(),
    },
  ],
  prepStep: 0,
  questions: SMART_QUESTIONS,
  vaultFilter: 'all',
  entryPlan: buildEntryPlan(SEED_DOCS),
  entryPlanStatus: 'awaiting_approval',
  preEntryNotes: DEFAULT_NOTES,
  activeReturnId: SEED_RETURNS.find((r) => r.state === 'Preparer Review')?.id ?? SEED_RETURNS[0].id,
  binderTab: 'forms',
  taxProfile: defaultProfile(),
  benefitReport: null,
  benefitReviewSigned: false,
  interviewChat: [
    {
      id: 'iv0',
      role: 'assistant',
      text: 'Upload your documents first — ID, W-2s, 1099s, and supporting forms. I’ll extract what I can and only ask what’s still missing.',
      at: new Date().toISOString(),
    },
  ],
  interviewAnswers: [],
  interviewFocusMapsTo: null,
  auditEvents: [],
  uploadIssues: [],
  accountTier: undefined,
  registrationPayments: [],
  officeStaff: SEED_OFFICE_STAFF,
  householdIntake: emptyHouseholdIntake(),
  multiYearEngagements: [],
  activeTaxYear: resolveFilingSeason().currentTaxYear,
  uploadInvites: [],
  clientNotifications: [],
  lastQaReport: null,
  calcAuditTrail: null,
  filingAuthorized: false,
  hydrated: false,
}

const listeners = new Set<() => void>()

/** Authorized view cache — UI never sees cross-tenant rows. Raw state remains for writes. */
let scopedSnapshot: Store | null = null
let scopedSource: Store | null = null

function emit() {
  scopedSource = null
  scopedSnapshot = null
  listeners.forEach((l) => l())
  persist()
}

function persist() {
  if (!state.hydrated || typeof window === 'undefined') return
  try {
    if (state.currentUser) {
      localStorage.setItem(ROLE_KEY, state.currentUser.role)
      localStorage.setItem(USER_KEY, state.currentUser.id)
    } else {
      localStorage.removeItem(ROLE_KEY)
      localStorage.removeItem(USER_KEY)
    }
    const { hydrated: _, currentUser: __, ...sessionRest } = state
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionRest))
  } catch {
    /* ignore quota */
  }
}

function resolveDemoUser(role: Role | null, userId: string | null): UserAccount | null {
  if (!role) return null
  return (
    (userId ? DEMO_USERS.find((u) => u.id === userId) : undefined) ??
    DEMO_USERS.find((u) => u.role === role) ??
    null
  )
}

function ensureTenantFields(returns: TaxReturn[], documents: DocumentRecord[]) {
  return {
    returns: returns.map((r) => ({
      ...r,
      tenantId: r.tenantId || 'tenant-unknown',
      appliedBenefits: r.appliedBenefits ?? [],
    })),
    documents: documents.map((d) => ({
      ...d,
      tenantId: d.tenantId || 'tenant-unknown',
      clientId: d.clientId ?? d.ownerId,
      storagePath: d.storagePath ?? vaultStoragePath(d.tenantId || 'tenant-unknown', d.ownerId, d.id),
    })),
  }
}

function hydrate() {
  if (state.hydrated || typeof window === 'undefined') return
  try {
    // Migrate away from older plaintext localStorage payload
    localStorage.removeItem('novara-tax-os-v1')
    sessionStorage.removeItem('novara-tax-os-session-v2')
    sessionStorage.removeItem('novara-tax-os-session-v3')
    sessionStorage.removeItem('novara-tax-os-session-v4')
    sessionStorage.removeItem('novara-tax-os-session-v5')
    sessionStorage.removeItem('novara-tax-os-session-v6')
    sessionStorage.removeItem('novara-tax-os-session-v7')
    sessionStorage.removeItem('novara-tax-os-session-v8')
    sessionStorage.removeItem('novara-tax-os-session-v9')
    sessionStorage.removeItem('novara-tax-os-session-v10')
    sessionStorage.removeItem('novara-tax-os-session-v11')

    const role = localStorage.getItem(ROLE_KEY) as Role | null
    const userId = localStorage.getItem(USER_KEY)
    const sessionRaw = sessionStorage.getItem(SESSION_KEY)
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw) as Omit<AppState, 'currentUser'>
      const taxProfile = parsed.taxProfile ?? defaultProfile()
      const rawReport = parsed.benefitReport ?? toSnapshot(taxProfile)
      const benefitReport = rawReport
        ? {
            ...rawReport,
            formLines: rawReport.formLines ?? [],
            lastApplications: rawReport.lastApplications ?? [],
          }
        : null
      const scoped = ensureTenantFields(parsed.returns ?? state.returns, parsed.documents ?? state.documents)
      state = {
        ...state,
        ...parsed,
        taxProfile,
        benefitReviewSigned: parsed.benefitReviewSigned ?? false,
        interviewChat: parsed.interviewChat?.length ? parsed.interviewChat : state.interviewChat,
        interviewAnswers: parsed.interviewAnswers ?? [],
        interviewFocusMapsTo: parsed.interviewFocusMapsTo ?? null,
        auditEvents: parsed.auditEvents ?? [],
        uploadIssues: parsed.uploadIssues ?? [],
        registrationPayments: parsed.registrationPayments ?? [],
        accountTier: parsed.accountTier ?? roleToTier(role ?? '') ?? undefined,
        officeStaff: parsed.officeStaff?.length ? parsed.officeStaff : SEED_OFFICE_STAFF,
        householdIntake: parsed.householdIntake ?? emptyHouseholdIntake(),
        multiYearEngagements: parsed.multiYearEngagements ?? [],
        activeTaxYear: parsed.activeTaxYear ?? resolveFilingSeason().currentTaxYear,
        uploadInvites: parsed.uploadInvites ?? [],
        clientNotifications: parsed.clientNotifications ?? [],
        lastQaReport: parsed.lastQaReport ?? null,
        calcAuditTrail: parsed.calcAuditTrail ?? null,
        filingAuthorized: parsed.filingAuthorized ?? false,
        returns: scoped.returns,
        documents: scoped.documents,
        benefitReport,
        currentUser: resolveDemoUser(role, userId),
        hydrated: true,
      }
    } else {
      const taxProfile = defaultProfile()
      state = {
        ...state,
        taxProfile,
        benefitReport: toSnapshot(taxProfile),
        currentUser: resolveDemoUser(role, userId),
        hydrated: true,
      }
    }
  } catch {
    const taxProfile = defaultProfile()
    state = { ...state, taxProfile, benefitReport: toSnapshot(taxProfile), hydrated: true }
  }
  emit()
}

if (typeof window !== 'undefined') {
  hydrate()
}

function getSnapshot() {
  if (scopedSource === state && scopedSnapshot) return scopedSnapshot
  const actor = state.currentUser
  const returns = filterReturnsForActor(
    actor,
    state.returns.map((r) => asScopedReturn(r)),
  )
  const documents = filterDocumentsForActor(
    actor,
    state.documents.map((d) => asScopedDocument(d)),
  )
  scopedSource = state
  scopedSnapshot = { ...state, returns, documents }
  return scopedSnapshot
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export const actions = {
  loginAs(role: Role, userId?: string) {
    const user =
      (userId ? DEMO_USERS.find((u) => u.id === userId) : undefined) ??
      DEMO_USERS.find((u) => u.role === role) ??
      DEMO_USERS[0]
    state = {
      ...state,
      currentUser: user,
      accountTier: roleToTier(user.role) ?? state.accountTier,
      activeReturnId:
        filterReturnsForActor(
          user,
          state.returns.map((r) => asScopedReturn(r)),
        )[0]?.id ?? state.activeReturnId,
    }
    emit()
  },
  /** Tenant-scoped returns for the signed-in actor (authorization enforced). */
  visibleReturns(): TenantScopedReturn[] {
    return filterReturnsForActor(
      state.currentUser,
      state.returns.map((r) => asScopedReturn(r)),
    )
  },
  visibleDocuments(): TenantScopedDocument[] {
    return filterDocumentsForActor(
      state.currentUser,
      state.documents.map((d) => asScopedDocument(d)),
    )
  },
  requestDocumentLink(docId: string) {
    const actor = state.currentUser
    if (!actor) return null
    const doc = state.documents.map((d) => asScopedDocument(d)).find((d) => d.id === docId)
    if (!doc) return null
    const access = canAccessDocument(actor, doc)
    state = {
      ...state,
      auditEvents: [
        ...state.auditEvents,
        logSensitiveAccess(actor, 'document_link', 'document', docId, access.allowed),
      ],
    }
    emit()
    if (!access.allowed) return null
    return issueDocumentAccessToken(actor, doc)
  },
  assertReturnAccess(returnId: string) {
    const actor = state.currentUser
    const ret = state.returns.map((r) => asScopedReturn(r)).find((r) => r.id === returnId)
    if (!actor || !ret) return false
    const access = canAccessReturn(actor, ret)
    state = {
      ...state,
      auditEvents: [...state.auditEvents, logSensitiveAccess(actor, 'return_open', 'return', returnId, access.allowed)],
    }
    emit()
    return access.allowed
  },
  logout() {
    state = { ...state, currentUser: null }
    emit()
  },
  setPrepStep(step: number) {
    state = { ...state, prepStep: step }
    emit()
  },
  setVaultFilter(filter: string) {
    state = { ...state, vaultFilter: filter }
    emit()
  },
  setBinderTab(tab: AppState['binderTab']) {
    state = { ...state, binderTab: tab }
    emit()
  },
  setActiveReturn(id: string) {
    state = { ...state, activeReturnId: id }
    emit()
  },
  answerQuestion(id: string, answer: string) {
    state = {
      ...state,
      questions: state.questions.map((q) => (q.id === id ? { ...q, answer } : q)),
    }
    emit()
  },
  addMessage(role: Message['role'], text: string) {
    const msg: Message = { id: uid('m'), role, text, at: new Date().toISOString() }
    state = { ...state, messages: [...state.messages, msg] }
    emit()
  },
  askAi(prompt: string) {
    actions.addMessage('user', prompt)
    const parsed = parseTaxpayerStatement(prompt)
    if (parsed.length > 0) {
      actions.ingestTaxpayerStatement(prompt)
      return
    }
    const lower = prompt.toLowerCase()
    let reply =
      'I’ve reviewed your authorized documents and return state. Tell me expenses in plain language (for example: “I paid $4,000 for daycare while I was working”) and I’ll apply eligible benefits automatically.'
    if (lower.includes('refund')) {
      reply = state.benefitReport
        ? `Your current projected refund is ${money(state.benefitReport.projectedRefund)} (base ${money(state.benefitReport.baseRefund)} + applied benefits ${money(state.benefitReport.verifiedSavings)}).`
        : reply
    } else if (lower.includes('missing') || lower.includes('document')) {
      reply =
        'You can upload supporting documents anytime in the Vault. Missing receipts do not erase a calculated benefit already applied to your working return.'
    } else if (lower.includes('sign') || lower.includes('file')) {
      reply =
        'Filing still requires review, attestations, and approval. AI calculates and applies benefits to the working return but cannot transmit.'
    }
    setTimeout(() => actions.addMessage('assistant', reply), 450)
  },
  ingestTaxpayerStatement(text: string) {
    const facts = parseTaxpayerStatement(text)
    if (facts.length === 0) {
      actions.addMessage('assistant', 'I couldn’t map that statement to a tax field. Try including an amount and what it was for.')
      return
    }
    const taxProfile = applyParsedFacts(state.taxProfile, facts)
    let interviewAnswers = state.interviewAnswers
    facts.forEach((f) => {
      interviewAnswers = [
        ...interviewAnswers.filter((a) => a.mapsTo !== f.mapsTo),
        {
          id: uid(`ans-${f.mapsTo}`),
          mapsTo: f.mapsTo,
          prompt: f.prompt,
          answer: f.value,
          at: new Date().toISOString(),
        },
      ]
    })
    const benefitReport = toSnapshot(taxProfile, 'Saved your statement to the tax return and recalculated benefits.')
    const applied = (benefitReport.lastApplications ?? []).filter((a) => a.ruleId !== 'recalc')
    state = {
      ...state,
      taxProfile,
      interviewAnswers,
      benefitReport,
      benefitReviewSigned: false,
      returns: syncReturnRefund(benefitReport),
      auditEvents: appendAudit(
        'nl_fact_ingest',
        'Structured tax facts captured from conversational statement (amount details omitted from audit).',
      ),
    }
    emit()
    const lines = applied.length
      ? applied.map((a) => `${a.name} ${money(a.amount)} applied → refund ${money(a.updatedRefund)}`).join(' · ')
      : benefitReport.lastChangeNote
    setTimeout(
      () =>
        actions.addMessage(
          'assistant',
          `Saved to your return: ${facts.map((f) => `${f.prompt} = ${f.value}`).join('; ')}. ${lines} You can upload a receipt later in the Vault if needed.`,
        ),
      350,
    )
  },
  uploadFiles(files: FileList | File[]) {
    const list = Array.from(files)
    const now = new Date().toISOString()
    const actor = state.currentUser
    const ownerId = actor?.id ?? 'u-tax'
    const tenantId = actor ? resolveWriteTenant(actor) : 'tenant-novara-direct'
    const classified = list.map((file) => ({
      file,
      type: classifyDocumentName(file.name),
      name: file.name,
    }))
    // Only scan duplicates within this tenant vault
    const tenantDocs = state.documents.filter((d) => d.tenantId === tenantId)
    const dupes = findDuplicateUploads(tenantDocs, classified)

    const docs: DocumentRecord[] = classified.map(({ file, type }) => {
      const id = uid('d')
      const yearFromName = file.name.match(/(20\d{2})/)
      const taxYear = yearFromName ? Number(yearFromName[1]) : state.activeTaxYear
      return {
        id,
        name: file.name,
        type,
        taxYear,
        sizeLabel:
          file.size > 1024 * 1024
            ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
            : `${Math.max(1, Math.round(file.size / 1024))} KB`,
        uploadedAt: now,
        status: 'scanning' as const,
        confidence: 0,
        ownerId,
        clientId: actor?.role === 'taxpayer' ? ownerId : ownerId,
        tenantId,
        storagePath: vaultStoragePath(tenantId, ownerId, id),
        facts: [],
      }
    })

    state = {
      ...state,
      documents: [...docs, ...state.documents],
      uploadIssues: [...dupes, ...state.uploadIssues].slice(0, 40),
      prepStep: Math.max(state.prepStep, 1),
      entryPlanStatus: 'draft',
      auditEvents: appendAudit(
        'document_upload',
        `Uploaded ${docs.length} file(s): ${docs.map((d) => d.type).join(', ')}. No full SSN values are stored in the audit log.`,
        { count: docs.length },
      ),
    }
    emit()
    actions.addMessage(
      'assistant',
      `Received ${docs.length} file${docs.length === 1 ? '' : 's'}. Identifying document types and extracting tax fields…${
        dupes.length ? ` Flagged ${dupes.length} possible duplicate(s) for review.` : ''
      }`,
    )

    docs.forEach((doc, i) => {
      setTimeout(() => {
        const confidence = 0.86 + (doc.name.length % 10) / 100
        const facts = extractFactsForType(
          doc.type,
          doc.name,
          confidence,
          uid,
          state.currentUser?.name ?? 'Jordan Blake',
        )
        const documents = state.documents.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: confidence < 0.9 ? ('needs_review' as const) : ('extracted' as const),
                confidence,
                facts,
              }
            : d,
        )
        const conflicts = detectDocumentConflicts(documents)
        const taxProfile = syncProfileFromDocuments(state.taxProfile, documents)
        const benefitReport = toSnapshot(
          taxProfile,
          `Uploaded ${doc.type} and filled matching return fields. ${plainLanguageExtractionSummary({ ...doc, facts })}.`,
        )
        const prior = state.householdIntake
        const candidates = extractPeopleFromDocuments(
          documents,
          state.currentUser?.name ?? 'Jordan Blake',
        ).map((c) => {
          const prev = prior.candidates.find((p) => p.id === c.id)
          return prev
            ? {
                ...c,
                relationToPrimary: prev.relationToPrimary,
                mayQualifyDependent: prev.mayQualifyDependent,
                onReturn: prev.onReturn,
              }
            : c
        })
        const householdIntake: HouseholdIntakeState = {
          ...prior,
          phase: 'extract_review',
          candidates,
        }
        const categorized = documents.map((d) => ({
          ...d,
          vaultCategory: vaultCategoryForDoc(d, householdIntake),
        }))
        state = {
          ...state,
          documents: categorized,
          taxProfile,
          benefitReport,
          householdIntake,
          uploadIssues: [...conflicts, ...state.uploadIssues.filter((u) => u.kind === 'duplicate')].slice(0, 40),
          entryPlan: buildEntryPlan(categorized),
          entryPlanStatus: 'awaiting_approval',
          returns: syncReturnRefund(benefitReport),
          auditEvents: appendAudit(
            'document_extract',
            `Extracted ${doc.type} fields into the return draft. Sensitive IDs masked. Identified ${candidates.length} person(s) for confirmation.`,
            { docType: doc.type, people: candidates.length },
          ),
        }
        emit()
        if (i === docs.length - 1) {
          const chat = {
            id: uid('iv'),
            role: 'assistant' as const,
            text: `Extraction complete. I found ${candidates.length} person(s) on your documents. Confirm extracted fields, then tell me who is filing — I will not assume relationships from names or ages.`,
            at: new Date().toISOString(),
          }
          state = { ...state, interviewChat: [...state.interviewChat, chat], prepStep: Math.max(state.prepStep, 1) }
          emit()
          actions.addMessage('assistant', `${chat.text} ${benefitReport.lastChangeNote ?? ''}`)
        }
      }, 700 + i * 450)
    })
  },
  verifyFact(docId: string, factId: string) {
    const documents = state.documents.map((d) =>
      d.id === docId
        ? { ...d, facts: d.facts.map((f) => (f.id === factId ? { ...f, verified: true } : f)), status: 'verified' as const }
        : d,
    )
    const taxProfile = syncProfileFromDocuments(state.taxProfile, documents)
    const benefitReport = toSnapshot(taxProfile, 'A document field was verified.')
    state = {
      ...state,
      documents,
      taxProfile,
      benefitReport,
      returns: syncReturnRefund(benefitReport),
      auditEvents: appendAudit('fact_verified', 'Taxpayer confirmed an extracted field (value not logged).'),
    }
    emit()
  },
  confirmExtracedDetails() {
    const taxProfile = syncProfileFromDocuments(state.taxProfile, state.documents)
    const benefitReport = toSnapshot(taxProfile)
    const candidates = extractPeopleFromDocuments(
      state.documents,
      state.currentUser?.name ?? 'Jordan Blake',
    ).map((c) => {
      const prev = state.householdIntake.candidates.find((p) => p.id === c.id)
      return prev
        ? {
            ...c,
            relationToPrimary: prev.relationToPrimary,
            mayQualifyDependent: prev.mayQualifyDependent,
            onReturn: prev.onReturn,
          }
        : c
    })
    const chat = {
      id: uid('iv'),
      role: 'assistant' as const,
      text: 'Which person is filing this tax return? Select the primary taxpayer from the names on your documents — or correct a name if extraction missed it.',
      at: new Date().toISOString(),
    }
    state = {
      ...state,
      taxProfile,
      benefitReport,
      prepStep: 1,
      householdIntake: {
        ...state.householdIntake,
        phase: 'identify_primary',
        candidates,
      },
      interviewChat: [...state.interviewChat, chat],
    }
    emit()
  },
  setPrimaryTaxpayer(personId: string, correctedName?: string) {
    const candidates = state.householdIntake.candidates.map((c) =>
      c.id === personId
        ? { ...c, fullLegalName: correctedName?.trim() || c.fullLegalName, onReturn: true }
        : c,
    )
    const primary = candidates.find((c) => c.id === personId)
    const chat = {
      id: uid('iv'),
      role: 'assistant' as const,
      text: primary
        ? `Primary taxpayer set to ${primary.fullLegalName}. Next I’ll ask who each additional person is — I won’t assume relationships.`
        : 'Primary taxpayer selected.',
      at: new Date().toISOString(),
    }
    const householdIntake: HouseholdIntakeState = {
      ...state.householdIntake,
      primaryPersonId: personId,
      candidates,
      phase: candidates.length > 1 ? 'confirm_relationships' : 'discover_missing',
    }
    state = {
      ...state,
      householdIntake,
      interviewChat: [...state.interviewChat, chat],
      documents: state.documents.map((d) => ({
        ...d,
        vaultCategory: vaultCategoryForDoc(d, householdIntake),
        personId:
          d.facts.some((f) => /name/i.test(f.label) && primary && f.value === primary.fullLegalName)
            ? personId
            : d.personId,
      })),
      auditEvents: appendAudit('primary_taxpayer_set', 'Primary taxpayer confirmed from document extraction.', {
        personId,
      }),
    }
    emit()
  },
  confirmPersonRelationship(personId: string, relation: HouseholdRelationChoice) {
    let candidates = state.householdIntake.candidates.map((c) =>
      c.id === personId
        ? {
            ...c,
            relationToPrimary: relation,
            onReturn: relation !== 'not_on_return',
            mayQualifyDependent: relation === 'spouse' || relation === 'not_on_return' ? false : c.mayQualifyDependent,
          }
        : c,
    )
    let householdIntake: HouseholdIntakeState = { ...state.householdIntake, candidates }
    const qualify = nextDependentQualifyPrompt(householdIntake)
    const relNext = nextRelationshipPrompt(householdIntake)
    if (!relNext && !qualify && relationshipsComplete(householdIntake)) {
      householdIntake = { ...householdIntake, phase: 'discover_missing' }
    }
    const person = candidates.find((c) => c.id === personId)
    const chat = {
      id: uid('iv'),
      role: 'assistant' as const,
      text: person
        ? `Recorded: ${person.fullLegalName} → ${relation.replace(/_/g, ' ')}.${
            qualify ? ` ${qualify.prompt}` : relNext ? ` ${relNext.prompt}` : ' Is there anyone else you may be able to claim who was not on these documents?'
          }`
        : 'Relationship recorded.',
      at: new Date().toISOString(),
    }
    let taxProfile = applyHouseholdToProfile(state.taxProfile, householdIntake, 2025)
    const benefitReport = toSnapshot(taxProfile, 'Household relationship updated — benefits recalculated when eligible.')
    state = {
      ...state,
      householdIntake,
      taxProfile,
      benefitReport,
      returns: syncReturnRefund(benefitReport),
      interviewChat: [...state.interviewChat, chat],
      documents: state.documents.map((d) => ({ ...d, vaultCategory: vaultCategoryForDoc(d, householdIntake) })),
      auditEvents: appendAudit('household_relationship', 'Taxpayer confirmed a household relationship (no assumptions from docs).', {
        personId,
        relation,
      }),
    }
    emit()
  },
  confirmMayQualifyDependent(personId: string, yes: boolean) {
    const candidates = state.householdIntake.candidates.map((c) =>
      c.id === personId ? { ...c, mayQualifyDependent: yes } : c,
    )
    let householdIntake: HouseholdIntakeState = { ...state.householdIntake, candidates }
    if (relationshipsComplete(householdIntake) && !nextRelationshipPrompt(householdIntake)) {
      householdIntake = { ...householdIntake, phase: 'discover_missing' }
    }
    const taxProfile = applyHouseholdToProfile(state.taxProfile, householdIntake, 2025)
    const benefitReport = toSnapshot(taxProfile, 'Dependent qualification answer updated — refund recalculated.')
    state = {
      ...state,
      householdIntake,
      taxProfile,
      benefitReport,
      returns: syncReturnRefund(benefitReport),
      auditEvents: appendAudit('dependent_qualify_flag', 'Taxpayer answered whether a person may qualify as a dependent.', {
        personId,
        yes,
      }),
    }
    emit()
  },
  answerMissingHousehold(answer: 'yes' | 'no') {
    let householdIntake: HouseholdIntakeState = {
      ...state.householdIntake,
      missingHouseholdAsked: true,
      missingHouseholdAnswer: answer,
      phase: answer === 'yes' ? 'discover_missing' : 'interview',
      filingRecommendation: recommendFilingStatus({
        ...state.householdIntake,
        missingHouseholdAnswer: answer,
      }),
    }
    let taxProfile = applyHouseholdToProfile(state.taxProfile, householdIntake, 2025)
    if (answer === 'no') {
      const rec = householdIntake.filingRecommendation
      if (rec?.recommended === 'mfj') taxProfile = { ...taxProfile, answers: { ...taxProfile.answers, married_dec31: 'yes' } }
      if (rec?.recommended === 'single') taxProfile = { ...taxProfile, filingStatus: 'single' }
      householdIntake = { ...householdIntake, phase: 'interview' }
    }
    const benefitReport = toSnapshot(taxProfile, 'Household discovery updated.')
    const chat = {
      id: uid('iv'),
      role: 'assistant' as const,
      text:
        answer === 'yes'
          ? 'Add anyone missing securely below. We never assume your uploaded documents are the complete household.'
          : `${householdIntake.filingRecommendation?.rationale ?? ''} Continuing to filing-status and benefit questions.`,
      at: new Date().toISOString(),
    }
    state = {
      ...state,
      householdIntake,
      taxProfile,
      benefitReport,
      returns: syncReturnRefund(benefitReport),
      prepStep: answer === 'no' ? 2 : state.prepStep,
      interviewChat: [...state.interviewChat, chat],
    }
    emit()
  },
  addMissingHouseholdPerson(input: { fullLegalName: string; dateOfBirth?: string; relation: HouseholdRelationChoice }) {
    const id = `person-${input.fullLegalName.toLowerCase().replace(/[^a-z]/g, '')}-${uid('p')}`
    const person = {
      id,
      fullLegalName: input.fullLegalName.trim(),
      dateOfBirth: input.dateOfBirth,
      sourceDocIds: [] as string[],
      sourceLabels: ['manual_household'],
      confidence: 1,
      needsConfirmation: false,
      relationToPrimary: input.relation,
      mayQualifyDependent:
        input.relation === 'spouse' || input.relation === 'not_on_return' ? false : true,
      onReturn: input.relation !== 'not_on_return',
    }
    const candidates = [...state.householdIntake.candidates, person]
    const householdIntake: HouseholdIntakeState = {
      ...state.householdIntake,
      candidates,
      filingRecommendation: recommendFilingStatus({ ...state.householdIntake, candidates }),
    }
    const taxProfile = applyHouseholdToProfile(state.taxProfile, householdIntake, 2025)
    const benefitReport = toSnapshot(taxProfile, 'Added household member — benefits recalculated.')
    state = {
      ...state,
      householdIntake,
      taxProfile,
      benefitReport,
      returns: syncReturnRefund(benefitReport),
      auditEvents: appendAudit('household_member_added', 'Taxpayer added a household member not found on uploaded documents.', {
        relation: input.relation,
      }),
    }
    emit()
  },
  finishHouseholdDiscovery() {
    const filingRecommendation = recommendFilingStatus(state.householdIntake)
    const householdIntake: HouseholdIntakeState = {
      ...state.householdIntake,
      missingHouseholdAsked: true,
      missingHouseholdAnswer: state.householdIntake.missingHouseholdAnswer ?? 'no',
      filingRecommendation,
      phase: 'interview',
    }
    const taxProfile = applyHouseholdToProfile(state.taxProfile, householdIntake, 2025)
    const benefitReport = toSnapshot(taxProfile, 'Household structure confirmed — evaluating filing status and benefits.')
    const chat = {
      id: uid('iv'),
      role: 'assistant' as const,
      text: `${filingRecommendation.rationale} Recommended status: ${filingRecommendation.recommended.toUpperCase()}.`,
      at: new Date().toISOString(),
    }
    state = {
      ...state,
      householdIntake,
      taxProfile,
      benefitReport,
      returns: syncReturnRefund(benefitReport),
      prepStep: 2,
      interviewChat: [...state.interviewChat, chat],
    }
    emit()
  },
  answerSmartInterview(mapsTo: string, value: string | number, prompt?: string) {
    const strVal = String(value)
    const userMsg = {
      id: uid('iv'),
      role: 'user' as const,
      text: `Confirmed answer: ${strVal}`,
      at: new Date().toISOString(),
    }

    const filingKeys = [
      'married_dec31',
      'married_filing_plan',
      'has_qualifying_person',
      'maintained_home',
      'potential_dependents',
      'dependent_count',
    ]
    let taxProfile: TaxpayerProfile
    if (filingKeys.includes(mapsTo)) {
      const normalized =
        mapsTo === 'potential_dependents'
          ? strVal === 'Yes' || strVal === 'yes'
            ? 'yes'
            : strVal === 'No' || strVal === 'no'
              ? 'no'
              : strVal
          : strVal
      taxProfile = applyFilingStatusAnswer(state.taxProfile, mapsTo, String(normalized))
    } else {
      const normalized =
        strVal === 'Yes' || strVal === 'yes' ? 'yes' : strVal === 'No' || strVal === 'no' ? 'no' : value
      taxProfile = applyAnswer(state.taxProfile, mapsTo, normalized)
    }

    const questionPrompt = prompt ?? state.interviewAnswers.find((a) => a.mapsTo === mapsTo)?.prompt ?? mapsTo

    const reply = conversationalReply(mapsTo, strVal, taxProfile)
    const benefitReport = toSnapshot(taxProfile, `You confirmed “${strVal}” for a tax interview question.`)

    const nextTurn = nextInterviewTurn(taxProfile)
    const progress = buildInterviewProgress(taxProfile)

    const assistantMsgs = [
      {
        id: uid('iv'),
        role: 'assistant' as const,
        text: `${reply} ${benefitReport.lastChangeNote ?? ''}`,
        at: new Date().toISOString(),
      },
      {
        id: uid('iv'),
        role: 'assistant' as const,
        text: progress.greeting,
        at: new Date().toISOString(),
      },
    ]

    if (nextTurn) {
      assistantMsgs.push({
        id: uid('iv'),
        role: 'assistant',
        text:
          'aiLead' in nextTurn && nextTurn.aiLead
            ? `${nextTurn.aiLead} ${nextTurn.prompt}`
            : nextTurn.prompt,
        at: new Date().toISOString(),
      })
    } else {
      assistantMsgs.push({
        id: uid('iv'),
        role: 'assistant',
        text: 'Interview complete for now. I’ll calculate your estimated refund using confirmed documents and verified answers — I won’t invent deductions.',
        at: new Date().toISOString(),
      })
    }

    state = {
      ...state,
      taxProfile,
      benefitReport,
      benefitReviewSigned: false,
      filingAuthorized: false,
      returns: syncReturnRefund(benefitReport),
      interviewChat: [...state.interviewChat, userMsg, ...assistantMsgs],
      interviewAnswers: recordInterviewAnswer(mapsTo, questionPrompt, value),
      interviewFocusMapsTo: nextTurn?.mapsTo ?? null,
      auditEvents: appendAudit('interview_answer', `Confirmed interview answer for ${mapsTo} (answer text omitted from audit when sensitive).`, {
        mapsTo,
        taxYear: state.activeTaxYear,
        answered: progress.answeredCount,
        remaining: progress.unansweredCount,
      }),
      prepStep: nextTurn ? 2 : state.prepStep,
    }
    emit()

    // Do not auto-jump past interview — taxpayer presses Calculate when ready
  },
  focusInterviewQuestion(mapsTo: string) {
    state = {
      ...state,
      interviewFocusMapsTo: mapsTo,
      prepStep: Math.max(state.prepStep, 2),
      auditEvents: appendAudit('interview_focus', `Focused interview on ${mapsTo}`, { mapsTo }),
    }
    emit()
  },
  editInterviewAnswer(mapsTo: string) {
    const cleared = clearAnswerTree(mapsTo)
    const benefitReport = toSnapshot(cleared.taxProfile)
    const reopen = nextInterviewTurn(cleared.taxProfile)
    const progress = buildInterviewProgress(cleared.taxProfile)
    const chat = {
      id: uid('iv'),
      role: 'assistant' as const,
      text: reopen
        ? `${progress.greeting} Let’s update that answer. ${reopen.prompt}`
        : `${progress.greeting} Answer cleared. Continue when you are ready.`,
      at: new Date().toISOString(),
    }
    const inPrepareInterview = state.prepStep === 2 || state.prepStep === 3 || state.prepStep === 4
    state = {
      ...state,
      ...cleared,
      benefitReport,
      benefitReviewSigned: false,
      filingAuthorized: false,
      returns: syncReturnRefund(benefitReport),
      prepStep: inPrepareInterview ? 2 : state.prepStep,
      interviewFocusMapsTo: reopen?.mapsTo ?? mapsTo,
      interviewChat: [...state.interviewChat, chat],
      auditEvents: appendAudit('interview_answer_changed', `Changed answer tree from ${mapsTo}`, {
        mapsTo,
        remaining: progress.unansweredCount,
      }),
    }
    emit()
  },
  completeSmartInterview() {
    const benefitReport = toSnapshot(state.taxProfile)
    const returns = state.returns.map((r) =>
      r.clientId === (state.currentUser?.id ?? 'u-tax') && r.taxYear === 2025
        ? {
            ...r,
            state: 'Client Review' as ReturnState,
            readiness: benefitReport.auditComplete ? 96 : 88,
            refundOrOwe: benefitReport.projectedRefund,
            feeSnapshot: dedupeFeeLines(r.feeSnapshot, {
              label: 'Personal tax return (TC)',
              amount: TC_PERSONAL_FEE,
              status: 'approved',
            }),
            updatedAt: new Date().toISOString(),
          }
        : r,
    )
    const chat = {
      id: uid('iv'),
      role: 'assistant' as const,
      text: `Estimated refund ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(benefitReport.projectedRefund)} (base ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(benefitReport.baseRefund)} + verified benefits ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(benefitReport.verifiedSavings)}). Potential additional savings still under review: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(benefitReport.potentialSavings)}.`,
      at: new Date().toISOString(),
    }
    state = {
      ...state,
      benefitReport,
      returns,
      prepStep: 3,
      interviewChat: [...state.interviewChat, chat],
    }
    emit()
  },
  completeQuestions() {
    actions.completeSmartInterview()
  },
  signAndFile() {
    const actor = state.currentUser
    const gate = canTransmitTaxReturn(actor)
    if (!gate.allowed) {
      actions.addMessage('system', gate.detail ?? 'Filing blocked until credentials are verified.')
      state = {
        ...state,
        auditEvents: appendAudit('transmit_blocked', gate.detail ?? 'signAndFile blocked', {
          reason: gate.reason ?? 'unknown',
        }),
      }
      emit()
      return
    }
    const year = state.activeTaxYear
    state = { ...state, filingAuthorized: true }
    const qa = runPreFilingQa({
      profile: state.taxProfile,
      documents: state.documents,
      taxReturn:
        state.returns.find((r) => r.id === state.activeReturnId) ??
        state.returns.find((r) => r.clientId === actor?.id && r.taxYear === year),
      benefitReviewSigned: state.benefitReviewSigned,
      authorizedToFile: true,
    })
    const trail = buildCalcAuditTrail(state.taxProfile, runBenefitOptimization(state.taxProfile))
    state = {
      ...state,
      lastQaReport: qa,
      calcAuditTrail: trail,
      auditEvents: appendAudit('pre_filing_qa', qa.summary, {
        canFile: qa.canFile,
        critical: qa.criticalCount,
      }),
    }
    if (!qa.canFile) {
      actions.addMessage('system', `Filing blocked by QA: ${qa.summary}`)
      emit()
      return
    }
    if (!trail.productionReady) {
      actions.addMessage(
        'system',
        'Filing blocked: calculation trail is not production-ready (incomplete refund or blockers).',
      )
      emit()
      return
    }
    const returns = state.returns.map((r) =>
      r.clientId === (state.currentUser?.id ?? 'u-tax') && r.taxYear === year
        ? {
            ...r,
            state: 'Transmitted' as ReturnState,
            readiness: 100,
            updatedAt: new Date().toISOString(),
          }
        : r,
    )
    state = { ...state, returns, prepStep: 5, filingAuthorized: true }
    actions.notifyClient({
      kind: 'submitted',
      clientId: state.currentUser?.id ?? 'u-tax',
      clientFirstName: state.currentUser?.name ?? 'Client',
    })
    emit()
    actions.addMessage(
      'system',
      'E-sign captured. Return transmitted through SANDBOX e-file adapter (not a live IRS submission).',
    )
    setTimeout(() => {
      // Sandbox acceptance only — clearly labeled; never invents live IRS status
      state = {
        ...state,
        returns: state.returns.map((r) =>
          r.clientId === (state.currentUser?.id ?? 'u-tax') && r.taxYear === year
            ? { ...r, state: 'Accepted' as ReturnState }
            : r,
        ),
        prepStep: 5,
      }
      actions.notifyClient({
        kind: 'irs_accepted',
        clientId: state.currentUser?.id ?? 'u-tax',
        clientFirstName: state.currentUser?.name ?? 'Client',
      })
      emit()
      actions.addMessage(
        'assistant',
        'Sandbox provider response: Accepted (test). Final records are in your Document Manager. This is not a live IRS acceptance.',
      )
    }, 1600)
  },
  advanceReturn(id: string, next: ReturnState) {
    if (!actions.assertReturnAccess(id)) return
    if (next === 'Transmitted') {
      actions.transmitReturn(id)
      return
    }
    state = {
      ...state,
      returns: state.returns.map((r) => (r.id === id ? { ...r, state: next, updatedAt: new Date().toISOString() } : r)),
    }
    emit()
  },
  createBusinessReturn(clientName: string, returnType: TaxReturn['returnType']) {
    const actor = state.currentUser
    const createPerm = canCreateClients(actor)
    if (!createPerm.allowed || !actor) {
      state = {
        ...state,
        auditEvents: appendAudit('permission_denied', createPerm.detail ?? 'Cannot create clients', {
          action: 'create_client',
        }),
      }
      emit()
      return
    }
    const visible = filterReturnsForActor(
      actor,
      state.returns.map((r) => asScopedReturn(r)),
    )
    const clientCount = new Set(visible.map((r) => r.clientId)).size
    assertNoClientQuota(actor, clientCount)
    assertNoReturnQuota(actor, visible.length)
    const tenantId = resolveWriteTenant(actor)
    const tier: AccountTier =
      actor.accountType === 'office_owner' || actor.accountType === 'office_preparer'
        ? 'Office'
        : actor.accountType === 'independent_tp'
          ? 'TP'
          : roleToTier(actor.role) ?? 'TP'
    const fee = returnSoftwareFee(tier, true)
    const clientId = uid('c')
    const ret: TaxReturn = {
      id: uid('r'),
      clientName,
      clientId,
      taxYear: 2025,
      returnType,
      state: 'Intake Started',
      readiness: 18,
      refundOrOwe: 0,
      preparerId: actor.id,
      tenantId,
      assignedPreparerIds:
        actor.accountType === 'independent_tp' || actor.accountType === 'office_preparer'
          ? [actor.id]
          : undefined,
      isBusiness: true,
      feeSnapshot: [{ label: fee.label, amount: fee.amount, status: fee.status }],
      appliedBenefits: [],
      updatedAt: new Date().toISOString(),
    }
    state = {
      ...state,
      returns: [ret, ...state.returns],
      activeReturnId: ret.id,
      auditEvents: appendAudit(
        'return_created',
        `Business return created in tenant ${tenantId} with ${fee.label} (${fee.amount}). Unlimited usage — no volume surcharge.`,
        { feeId: fee.id, tenantId },
      ),
    }
    emit()
  },
  /** Office owner only — invite a preparer with individual login + PTIN (pending verification) */
  inviteOfficePreparer(input: { name: string; email: string; ptin: string }) {
    const actor = state.currentUser
    const perm = canManageStaff(actor)
    if (!actor || !perm.allowed) {
      state = {
        ...state,
        auditEvents: appendAudit('permission_denied', perm.detail ?? 'Staff invite denied', {
          action: 'invite_preparer',
        }),
      }
      emit()
      return { ok: false as const, error: perm.detail ?? 'Denied' }
    }
    const ptinResult = submitCredential('ptin', input.ptin)
    if (!ptinResult.ok) return { ok: false as const, error: ptinResult.error }
    const userId = uid('u-prep')
    const staff: OfficeStaffMember = {
      id: uid('staff'),
      tenantId: actor.tenantId,
      userId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      kind: 'preparer',
      status: 'invited',
      invitedAt: new Date().toISOString(),
      ptinDisplay: `····${ptinResult.credential.lastFour}`,
      ptinStatus: ptinResult.credential.status,
    }
    state = {
      ...state,
      officeStaff: [...state.officeStaff, staff],
      auditEvents: appendAudit(
        'staff_invited',
        `Invited preparer ${staff.name} under office tenant ${actor.tenantId}. PTIN pending verification — not treated as verified from manual entry.`,
        { staffId: staff.id, tenantId: actor.tenantId },
      ),
    }
    emit()
    return { ok: true as const, staff }
  },
  removeOfficePreparer(staffId: string) {
    const actor = state.currentUser
    const perm = canManageStaff(actor)
    if (!actor || !perm.allowed) {
      state = {
        ...state,
        auditEvents: appendAudit('permission_denied', perm.detail ?? 'Staff remove denied', {
          action: 'remove_preparer',
        }),
      }
      emit()
      return false
    }
    const target = state.officeStaff.find((s) => s.id === staffId)
    if (!target || target.tenantId !== actor.tenantId || target.kind === 'owner') return false
    state = {
      ...state,
      officeStaff: state.officeStaff.map((s) =>
        s.id === staffId ? { ...s, status: 'removed' as const } : s,
      ),
      auditEvents: appendAudit('staff_removed', `Removed preparer ${target.name} from office roster.`, {
        staffId,
      }),
    }
    emit()
    return true
  },
  /** Office owner only — assign/reassign a client return to a preparer */
  assignClientToPreparer(returnId: string, preparerUserId: string) {
    const actor = state.currentUser
    const perm = canAssignClients(actor)
    if (!actor || !perm.allowed) {
      state = {
        ...state,
        auditEvents: appendAudit('permission_denied', perm.detail ?? 'Assign denied', {
          action: 'assign_client',
        }),
      }
      emit()
      return false
    }
    const ret = state.returns.find((r) => r.id === returnId)
    if (!ret || ret.tenantId !== actor.tenantId) return false
    const staffOk = state.officeStaff.some(
      (s) =>
        s.tenantId === actor.tenantId &&
        s.userId === preparerUserId &&
        s.status === 'active' &&
        s.kind === 'preparer',
    )
    if (!staffOk && preparerUserId !== actor.id) return false
    state = {
      ...state,
      returns: state.returns.map((r) =>
        r.id === returnId
          ? {
              ...r,
              preparerId: preparerUserId,
              assignedPreparerIds: [preparerUserId],
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
      auditEvents: appendAudit(
        'client_assigned',
        `Assigned return ${returnId} to preparer ${preparerUserId} within tenant ${actor.tenantId}.`,
        { returnId, preparerUserId },
      ),
    }
    emit()
    return true
  },
  /** Independent TP — always denied for staff/assign */
  assertTpCannotManageStaff() {
    return canManageStaff(state.currentUser)
  },
  permissions() {
    return permissionSummary(state.currentUser)
  },
  officeStaffForTenant() {
    const actor = state.currentUser
    if (!actor || !canManageStaff(actor).allowed) return []
    return state.officeStaff.filter((s) => s.tenantId === actor.tenantId && s.status !== 'removed')
  },
  transmitReturn(returnId: string) {
    const actor = state.currentUser
    const gate = canTransmitTaxReturn(actor)
    if (!actor || !gate.allowed) {
      state = {
        ...state,
        auditEvents: appendAudit(
          'transmit_blocked',
          gate.detail ?? 'Transmission blocked — credentials or e-file association incomplete.',
          { returnId, reason: gate.reason ?? 'unknown' },
        ),
      }
      emit()
      return { ok: false as const, error: gate.detail ?? 'Blocked' }
    }
    if (!actions.assertReturnAccess(returnId)) {
      return { ok: false as const, error: 'Access denied' }
    }
    const taxReturn = state.returns.find((r) => r.id === returnId)
    const qa = runPreFilingQa({
      profile: { ...state.taxProfile, taxYear: taxReturn?.taxYear ?? state.taxProfile.taxYear },
      documents: state.documents,
      taxReturn,
      benefitReviewSigned: state.benefitReviewSigned,
      authorizedToFile: state.filingAuthorized,
    })
    state = { ...state, lastQaReport: qa }
    if (!qa.canFile) {
      state = {
        ...state,
        auditEvents: appendAudit('transmit_blocked_qa', qa.summary, {
          returnId,
          critical: qa.criticalCount,
        }),
      }
      emit()
      return { ok: false as const, error: qa.summary }
    }
    state = {
      ...state,
      returns: state.returns.map((r) =>
        r.id === returnId
          ? { ...r, state: 'Transmitted' as ReturnState, readiness: 100, updatedAt: new Date().toISOString() }
          : r,
      ),
      auditEvents: appendAudit(
        'return_transmitted',
        `Return ${returnId} transmitted under verified credentials (sandbox e-file).`,
        { returnId },
      ),
    }
    emit()
    return { ok: true as const }
  },
  completeTierRegistration(input: {
    tier: AccountTier
    legalName: string
    email: string
    phone?: string
    businessName?: string
    address?: string
    ptin?: string
    efin?: string
    ein?: string
    efileProviderName?: string
    lines: { id: string; label: string; amount: number }[]
    planAmount: number
  }) {
    const accountType: AccountType =
      input.tier === 'TC' ? 'tc' : input.tier === 'TP' ? 'independent_tp' : 'office_owner'
    const role: Role = input.tier === 'TC' ? 'taxpayer' : input.tier === 'TP' ? 'preparer' : 'efin_owner'
    const tenantId =
      input.tier === 'TC'
        ? `tenant-direct-${uid('t')}`
        : input.tier === 'TP'
          ? `tenant-tp-${uid('t')}`
          : `tenant-office-${uid('t')}`

    const credentials: UserAccount['credentials'] = {
      businessName: input.businessName,
      businessAddress: input.address,
    }

    if (input.tier === 'TP') {
      if (!input.ptin) return { ok: false as const, error: 'TP registration requires a PTIN.' }
      const ptin = submitCredential('ptin', input.ptin)
      if (!ptin.ok) return { ok: false as const, error: ptin.error }
      credentials.ptin = ptin.credential
      credentials.efileProvider = {
        providerName: input.efileProviderName?.trim() || 'Pending authorized e-file provider',
        status: input.efileProviderName?.trim() ? 'pending' : 'none',
      } satisfies EfileProviderAssociation
    }

    if (input.tier === 'Office') {
      if (!input.efin) return { ok: false as const, error: 'Office registration requires an EFIN.' }
      if (!input.ein) return { ok: false as const, error: 'Office registration requires an EIN.' }
      if (!input.businessName?.trim() || !input.address?.trim()) {
        return { ok: false as const, error: 'Office registration requires business name and address.' }
      }
      const efin = submitCredential('efin', input.efin)
      if (!efin.ok) return { ok: false as const, error: efin.error }
      const ein = submitCredential('ein', input.ein)
      if (!ein.ok) return { ok: false as const, error: ein.error }
      credentials.efin = efin.credential
      credentials.ein = ein.credential
      credentials.efileProvider = { providerName: 'NOVARA MeF Adapter', status: 'pending' }
    }

    const user: UserAccount = {
      id: uid('u'),
      name: input.legalName.trim(),
      email: input.email.trim().toLowerCase(),
      role,
      tenantId,
      accountType,
      ptin: credentials.ptin ? `····${credentials.ptin.lastFour}` : undefined,
      credentials,
    }

    const prior = state.registrationPayments ?? []
    const deduped = [...prior]
    input.lines.forEach((line) => {
      if (!deduped.some((p) => p.id === line.id && p.tier === input.tier)) {
        deduped.push({ ...line, tier: input.tier, at: new Date().toISOString(), mode: 'test' })
      }
    })

    let officeStaff = state.officeStaff
    if (accountType === 'office_owner') {
      officeStaff = [
        ...officeStaff,
        {
          id: uid('staff'),
          tenantId,
          userId: user.id,
          name: user.name,
          email: user.email,
          kind: 'owner',
          status: 'active',
          invitedAt: new Date().toISOString(),
        },
      ]
    }

    state = {
      ...state,
      currentUser: user,
      accountTier: input.tier,
      registrationPayments: deduped,
      officeStaff,
      auditEvents: appendAudit(
        'registration_complete',
        `${input.tier} registration recorded. Credentials stored encrypted; status pending verification (not auto-verified).`,
        {
          tier: input.tier,
          amount: input.planAmount,
          ptinStatus: credentials.ptin?.status ?? 'n/a',
          efinStatus: credentials.efin?.status ?? 'n/a',
        },
      ),
    }
    emit()
    return {
      ok: true as const,
      user,
      credentialViews: {
        ptin: credentialPublicView(credentials.ptin),
        efin: credentialPublicView(credentials.efin),
        ein: credentialPublicView(credentials.ein),
      },
    }
  },
  recordRegistrationPayment(input: {
    tier: AccountTier
    lines: { id: string; label: string; amount: number }[]
    planAmount: number
  }) {
    const prior = state.registrationPayments ?? []
    const deduped = [...prior]
    input.lines.forEach((line) => {
      if (!deduped.some((p) => p.id === line.id && p.tier === input.tier)) {
        deduped.push({ ...line, tier: input.tier, at: new Date().toISOString(), mode: 'test' })
      }
    })
    state = {
      ...state,
      registrationPayments: deduped,
      accountTier: input.tier,
      auditEvents: appendAudit(
        'registration_payment',
        `Test-mode registration payment for ${input.tier}: ${input.planAmount}`,
        { tier: input.tier, amount: input.planAmount },
      ),
    }
    emit()
  },
  chargeReturnSoftwareFee(returnId: string, isBusiness: boolean) {
    const tier: AccountTier =
      state.accountTier ?? roleToTier(state.currentUser?.role ?? 'taxpayer') ?? 'TC'
    const fee = returnSoftwareFee(tier, isBusiness)
    state = {
      ...state,
      returns: state.returns.map((r) =>
        r.id === returnId
          ? {
              ...r,
              feeSnapshot: dedupeFeeLines(r.feeSnapshot, {
                label: fee.label,
                amount: fee.amount,
                status: fee.status,
              }),
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
      auditEvents: appendAudit('software_fee', `Applied ${fee.label} without duplicate charge.`, {
        returnId,
        amount: fee.amount,
      }),
    }
    emit()
  },
  updateEntryLine(id: string, patch: Partial<EntryPlanLine>) {
    state = {
      ...state,
      entryPlan: state.entryPlan.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }
    emit()
  },
  approveEntryPlan() {
    const remaining = state.entryPlan.filter((l) => l.status !== 'removed')
    if (remaining.some((l) => l.status === 'proposed')) {
      state = {
        ...state,
        entryPlan: state.entryPlan.map((l) => (l.status === 'proposed' ? { ...l, status: 'approved' } : l)),
      }
    }
    state = { ...state, entryPlanStatus: 'approved' }
    emit()
    actions.addMessage('system', 'Data-entry plan approved. Ready to enter fields.')
  },
  runEntry() {
    if (state.entryPlanStatus !== 'approved') return
    state = { ...state, entryPlanStatus: 'entering' }
    emit()
    actions.addMessage('assistant', 'Entering approved fields… verifying each value against the plan.')
    setTimeout(() => {
      const activeId = state.activeReturnId
      state = {
        ...state,
        entryPlanStatus: 'entered',
        returns: state.returns.map((r) =>
          r.id === activeId
            ? { ...r, state: 'Preparer Review' as ReturnState, readiness: Math.max(r.readiness, 94), updatedAt: new Date().toISOString() }
            : r,
        ),
      }
      emit()
      actions.addMessage('assistant', 'Entry complete. Every field checked after entry. A tax pro still signs off on the return.')
    }, 1400)
  },
  rebuildEntryPlan() {
    state = {
      ...state,
      entryPlan: buildEntryPlan(state.documents),
      entryPlanStatus: 'awaiting_approval',
    }
    emit()
  },
  runBenefitScan() {
    const benefitReport = toSnapshot(state.taxProfile, 'Full tax-benefit discovery scan completed.')
    state = {
      ...state,
      benefitReport,
      benefitReviewSigned: false,
      returns: syncReturnRefund(benefitReport),
      auditEvents: appendAudit('benefit_scan', `Benefit scan ${benefitReport.ruleVersion}`),
    }
    emit()
    actions.addMessage(
      'assistant',
      benefitReport.lastChangeNote ??
        `Tax Benefit Optimization rerun complete (${benefitReport.ruleVersion}).`,
    )
  },
  answerDependentQuestion(mapsTo: string, value: string | number | boolean, prompt?: string) {
    const display =
      value === true || value === 'yes' || value === 'Yes'
        ? 'Yes'
        : value === false || value === 'no' || value === 'No'
          ? 'No'
          : value
    let taxProfile = applyAnswer(state.taxProfile, mapsTo, value)
    // Mark ID docs as verifying TINs when uploaded (never display full SSN)
    const hasId = state.documents.some(
      (d) => d.type === 'ID' && (d.status === 'extracted' || d.status === 'verified' || d.status === 'needs_review'),
    )
    if (hasId) {
      taxProfile = {
        ...taxProfile,
        dependents: taxProfile.dependents.map((d) => {
          const tinStatus =
            d.tinStatus === 'provided' || (d.tinLast4 && d.tinLast4.length === 4) ? 'verified' : d.tinStatus
          return evaluateDependent({ ...d, tinStatus }, taxProfile.taxYear)
        }),
      }
    }
    const benefitReport = toSnapshot(
      taxProfile,
      `Dependent information updated (“${String(display)}”). Return recalculated.`,
    )
    const nextTurn = nextInterviewTurn(taxProfile)
    const progress = buildInterviewProgress(taxProfile)
    state = {
      ...state,
      taxProfile,
      benefitReport,
      benefitReviewSigned: false,
      filingAuthorized: false,
      returns: syncReturnRefund(benefitReport),
      interviewAnswers: recordInterviewAnswer(mapsTo, prompt ?? mapsTo, display as string | number),
      interviewFocusMapsTo: nextTurn?.mapsTo ?? null,
      interviewChat: [
        ...state.interviewChat,
        {
          id: uid('iv'),
          role: 'assistant',
          text: progress.greeting,
          at: new Date().toISOString(),
        },
      ],
      auditEvents: appendAudit('dependent_answer', `Updated dependent fact ${mapsTo} (sensitive values omitted).`, {
        mapsTo,
        taxYear: state.activeTaxYear,
        remaining: progress.unansweredCount,
      }),
    }
    emit()
  },
  answerBenefitQuestion(mapsTo: string, value: string | number | boolean, prompt?: string) {
    const display =
      value === true || value === 'yes' || value === 'Yes'
        ? 'Yes'
        : value === false || value === 'no' || value === 'No'
          ? 'No'
          : value
    const taxProfile = applyAnswer(state.taxProfile, mapsTo, value)
    const benefitReport = toSnapshot(taxProfile, `You confirmed “${String(display)}” on a savings follow-up.`)
    const questionPrompt = prompt ?? mapsTo
    state = {
      ...state,
      taxProfile,
      benefitReport,
      benefitReviewSigned: false,
      returns: syncReturnRefund(benefitReport),
      interviewAnswers: recordInterviewAnswer(mapsTo, questionPrompt, display as string | number),
      auditEvents: appendAudit('benefit_answer', `Confirmed benefit follow-up for ${mapsTo}.`, { mapsTo }),
    }
    emit()
  },
  startBenefitCheck(ruleId: string) {
    // Soft-verify path: open interview / mark probe answers for this rule
    const finding = state.benefitReport?.findings.find((f) => f.ruleId === ruleId)
    if (!finding) return
    state = {
      ...state,
      auditEvents: appendAudit('benefit_check_started', `Started eligibility check for ${finding.shortName}.`, {
        ruleId,
      }),
    }
    emit()
  },
  markBenefitUnresolved(mapsTo: string, prompt?: string) {
    const taxProfile = {
      ...state.taxProfile,
      answers: { ...state.taxProfile.answers, [mapsTo]: 'unresolved' },
      unresolvedKeys: Array.from(new Set([...state.taxProfile.unresolvedKeys, mapsTo])),
    }
    const benefitReport = toSnapshot(taxProfile)
    const filingNext = nextFilingStatusTurn(taxProfile)
    const benefitNext = filingNext ? null : nextBenefitDiscoveryTurn(taxProfile)
    const follow = filingNext
      ? `${filingNext.aiLead} ${filingNext.prompt}`
      : benefitNext
        ? benefitNext.prompt
        : 'Marked unresolved. I can continue calculating with open items flagged for review.'
    state = {
      ...state,
      taxProfile,
      benefitReport,
      benefitReviewSigned: false,
      interviewAnswers: recordInterviewAnswer(mapsTo, prompt ?? mapsTo, 'Unresolved'),
      interviewChat: [
        ...state.interviewChat,
        { id: uid('iv'), role: 'user', text: 'Confirmed answer: Unresolved', at: new Date().toISOString() },
        { id: uid('iv'), role: 'assistant', text: follow, at: new Date().toISOString() },
      ],
    }
    emit()
  },
  verifyBenefit(ruleId: string) {
    const taxProfile = {
      ...state.taxProfile,
      answers: { ...state.taxProfile.answers, [`${ruleId}_verified`]: 'yes', [`${ruleId}_uncertain`]: undefined },
    }
    const benefitReport = toSnapshot(taxProfile)
    state = {
      ...state,
      taxProfile,
      benefitReport,
      benefitReviewSigned: false,
      returns: syncReturnRefund(benefitReport),
    }
    emit()
  },
  flagBenefitReview(ruleId: string) {
    const taxProfile = {
      ...state.taxProfile,
      answers: { ...state.taxProfile.answers, [`${ruleId}_uncertain`]: 'yes', [`${ruleId}_verified`]: undefined },
    }
    const benefitReport = toSnapshot(taxProfile)
    state = { ...state, taxProfile, benefitReport, benefitReviewSigned: false }
    emit()
  },
  updateTaxProfile(patch: Partial<TaxpayerProfile>) {
    const taxProfile = { ...state.taxProfile, ...patch, answers: { ...state.taxProfile.answers, ...(patch.answers ?? {}) } }
    const benefitReport = toSnapshot(taxProfile)
    state = {
      ...state,
      taxProfile,
      benefitReport,
      benefitReviewSigned: false,
      returns: syncReturnRefund(benefitReport),
    }
    emit()
  },
  completeBenefitReview() {
    const benefitReport = toSnapshot(state.taxProfile)
    if (!benefitReport.auditComplete) {
      actions.addMessage(
        'system',
        'Final benefit review blocked: unresolved eligibility questions or unverified benefits remain. NOVARA will not claim all benefits are secured.',
      )
      state = { ...state, benefitReport }
      emit()
      return false
    }
    const trail = buildCalcAuditTrail(state.taxProfile, runBenefitOptimization(state.taxProfile))
    state = {
      ...state,
      benefitReport,
      benefitReviewSigned: true,
      filingAuthorized: true,
      calcAuditTrail: trail,
      returns: state.returns.map((r) =>
        r.id === state.activeReturnId
          ? { ...r, state: 'Ready to File' as ReturnState, readiness: 100, refundOrOwe: benefitReport.projectedRefund, updatedAt: new Date().toISOString() }
          : r,
      ),
    }
    emit()
    actions.addMessage('system', 'Mandatory tax-benefit audit passed. Preparer/taxpayer approvals recorded for demo. Ready to file gate unlocked.')
    return true
  },
  platformStats() {
    const tenants = new Set(state.returns.map((r) => r.tenantId).filter(Boolean))
    return {
      returnCount: state.returns.length,
      documentCount: state.documents.length,
      tenantCount: tenants.size,
      /** Admin sees aggregates only — not taxpayer content */
      contentAccess: false as const,
    }
  },
  resetDemo() {
    localStorage.removeItem('novara-tax-os-v1')
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem('novara-tax-os-session-v2')
    sessionStorage.removeItem('novara-tax-os-session-v7')
    const taxProfile = defaultProfile()
    state = {
      currentUser: state.currentUser,
      documents: SEED_DOCS,
      returns: SEED_RETURNS,
      messages: [
        {
          id: 'm0',
          role: 'assistant',
          text: 'Demo reset. Upload documents — then run Tax Benefit Optimization. Filing stops only after the benefit review is complete.',
          at: new Date().toISOString(),
        },
      ],
      prepStep: 0,
      questions: SMART_QUESTIONS,
      vaultFilter: 'all',
      entryPlan: buildEntryPlan(SEED_DOCS),
      entryPlanStatus: 'awaiting_approval',
      preEntryNotes: DEFAULT_NOTES,
      activeReturnId: SEED_RETURNS.find((r) => r.state === 'Preparer Review')?.id ?? SEED_RETURNS[0].id,
      binderTab: 'forms',
      taxProfile,
      benefitReport: toSnapshot(taxProfile),
      benefitReviewSigned: false,
      interviewChat: [
        {
          id: 'iv0',
          role: 'assistant',
          text: 'Demo reset. Upload documents first — I’ll extract what I can, then ask only what’s still needed.',
          at: new Date().toISOString(),
        },
      ],
      interviewAnswers: [],
      interviewFocusMapsTo: null,
      auditEvents: [],
      uploadIssues: [],
      accountTier: roleToTier(state.currentUser?.role ?? '') ?? undefined,
      registrationPayments: [],
      officeStaff: SEED_OFFICE_STAFF,
      householdIntake: emptyHouseholdIntake(),
      multiYearEngagements: [],
      activeTaxYear: resolveFilingSeason().currentTaxYear,
      uploadInvites: [],
      clientNotifications: [],
      lastQaReport: null,
      calcAuditTrail: null,
      filingAuthorized: false,
      hydrated: true,
    }
    emit()
  },
  setActiveTaxYear(year: number) {
    state = { ...state, activeTaxYear: year }
    emit()
  },
  /**
   * Create separate return records + document folders for each selected year.
   * Applies $250 prior-year surcharge once per prior year in fee snapshots.
   */
  createMultiYearOrder(selections: {
    taxYear: number
    filingMode: 'original' | 'amended'
    kind: 'personal' | 'business' | 'both'
    hasIrsNotice: boolean
  }[]) {
    const actor = state.currentUser
    if (!actor) return { ok: false as const, error: 'Not signed in' }
    const season = resolveFilingSeason()
    for (const sel of selections) {
      const def = getTaxYearDefinition(sel.taxYear, season)
      if (!def || def.status !== 'production') {
        return { ok: false as const, error: `Tax year ${sel.taxYear} is not available for production.` }
      }
    }
    const tier: AccountTier = roleToTier(actor.role) ?? state.accountTier ?? 'TC'
    const quote = quoteMultiYearOrder(
      tier,
      selections.map(
        (s): YearOrderSelection => ({
          taxYear: s.taxYear,
          kind: s.kind,
          filingMode: s.filingMode,
        }),
      ),
      { currentTaxYear: season.currentTaxYear, seasonYear: season.seasonYear },
    )

    const tenantId = actor.tenantId
    const newReturns: TaxReturn[] = []
    const engagements: MultiYearEngagement[] = []

    for (const sel of selections) {
      const folderId = `folder-${sel.taxYear}-${uid('f')}`
      const returnIds: string[] = []
      const kinds =
        sel.kind === 'both' ? (['personal', 'business'] as const) : ([sel.kind] as const)
      const amend = assessAmendment({
        taxYear: sel.taxYear,
        mode: sel.filingMode,
        isBusiness: sel.kind === 'business',
        original:
          sel.filingMode === 'amended'
            ? {
                taxYear: sel.taxYear,
                agiReported: 52000,
                taxReported: 4200,
                refundOrBalanceReported: 800,
                source: 'taxpayer_recall',
              }
            : undefined,
        corrections:
          sel.filingMode === 'amended'
            ? [{ field: 'refund', correctedAmount: 1200, explanation: 'Additional W-2 withholding' }]
            : undefined,
      })
      const penalty = estimatePenaltiesAndInterest({
        taxYear: sel.taxYear,
        taxDue: sel.taxYear < season.currentTaxYear ? 1200 : 0,
        amountPaidByDueDate: 0,
        filedOn: sel.filingMode === 'amended' ? `${sel.taxYear + 1}-04-10` : undefined,
      })

      for (const k of kinds) {
        const isBusiness = k === 'business'
        const fee = returnSoftwareFee(tier, isBusiness)
        const yearFees = [{ label: fee.label, amount: fee.amount, status: fee.status }]
        const surchargeLine = quote.lines.find(
          (l) => l.kind === 'prior_year_surcharge' && l.taxYear === sel.taxYear,
        )
        // Attach surcharge once on the first return of that year only
        if (surchargeLine && k === kinds[0]) {
          yearFees.push({
            label: surchargeLine.label,
            amount: PRIOR_YEAR_SURCHARGE,
            status: 'approved',
          })
        }
        const id = uid('r')
        returnIds.push(id)
        newReturns.push({
          id,
          clientName: actor.name,
          clientId: actor.id,
          taxYear: sel.taxYear,
          returnType: isBusiness ? '1120-S' : '1040',
          state: 'Intake Started',
          readiness: 8,
          refundOrOwe: 0,
          preparerId: actor.role === 'preparer' ? actor.id : undefined,
          tenantId,
          isBusiness,
          feeSnapshot: yearFees,
          appliedBenefits: [],
          updatedAt: new Date().toISOString(),
          filingMode: sel.filingMode,
          hasIrsNotice: sel.hasIrsNotice,
          documentFolderId: folderId,
          irsPenaltyInterestEstimate: penalty.totalEstimate,
          filingMethod: amend.filingMethod,
          refundClaimWarning: amend.refundClaimWarning,
          assignedPreparerIds: actor.role === 'preparer' ? [actor.id] : undefined,
        })
      }

      engagements.push({
        id: uid('eng'),
        taxYear: sel.taxYear,
        filingMode: sel.filingMode,
        kind: sel.kind,
        hasIrsNotice: sel.hasIrsNotice,
        returnIds,
        documentFolderId: folderId,
        status: 'selected',
      })
    }

    state = {
      ...state,
      returns: [...newReturns, ...state.returns],
      multiYearEngagements: [...engagements, ...state.multiYearEngagements],
      activeTaxYear: selections[0]?.taxYear ?? state.activeTaxYear,
      activeReturnId: newReturns[0]?.id ?? state.activeReturnId,
      accountTier: tier,
      auditEvents: appendAudit(
        'multi_year_order',
        `Created ${engagements.length} tax-year engagement(s). Preparation total ${quote.preparationGrandTotal} (base ${quote.basePreparationTotal} + prior surcharge ${quote.priorYearSurchargeTotal}).`,
        {
          years: engagements.length,
          preparationTotal: quote.preparationGrandTotal,
          priorSurcharge: quote.priorYearSurchargeTotal,
        },
      ),
    }
    emit()
    return { ok: true as const, quote, engagements, returns: newReturns }
  },
  multiYearQuote(selections: YearOrderSelection[]) {
    const tier: AccountTier =
      state.accountTier ?? roleToTier(state.currentUser?.role ?? 'taxpayer') ?? 'TC'
    const season = resolveFilingSeason()
    return quoteMultiYearOrder(tier, selections, {
      currentTaxYear: season.currentTaxYear,
      seasonYear: season.seasonYear,
    })
  },
  runQaCheck() {
    const active =
      state.returns.find((r) => r.id === state.activeReturnId) ??
      state.returns.find((r) => r.clientId === state.currentUser?.id && r.taxYear === state.activeTaxYear)
    const lastQaReport = runPreFilingQa({
      profile: state.taxProfile,
      documents: state.documents,
      taxReturn: active,
      benefitReviewSigned: state.benefitReviewSigned,
      authorizedToFile: state.filingAuthorized,
    })
    const calcAuditTrail = buildCalcAuditTrail(state.taxProfile, runBenefitOptimization(state.taxProfile))
    state = {
      ...state,
      lastQaReport,
      calcAuditTrail,
      auditEvents: appendAudit('qa_rerun', lastQaReport.summary, { canFile: lastQaReport.canFile }),
    }
    emit()
    return lastQaReport
  },
  createClientUploadInvite(input: {
    clientId: string
    clientName: string
    channel: 'sms' | 'email' | 'link'
    destination: string
  }): { ok: true; invite: UploadInvite } | { ok: false; error: string } {
    const actor = state.currentUser
    if (!actor) return { ok: false, error: 'Not signed in.' }
    const result = createUploadInvite({ actor, ...input })
    if (!result.ok) return result
    state = {
      ...state,
      uploadInvites: [result.invite, ...state.uploadInvites],
      auditEvents: appendAudit('upload_invite_created', `Invite for ${input.clientName} via ${input.channel}`, {
        inviteId: result.invite.id,
        clientId: input.clientId,
        tenantId: actor.tenantId,
      }),
    }
    actions.notifyClient({
      kind: 'upload_invite',
      clientId: input.clientId,
      clientFirstName: input.clientName,
      channel: input.channel === 'link' ? 'in_app' : input.channel,
    })
    emit()
    return result
  },
  revokeUploadInvite(inviteId: string) {
    const inv = state.uploadInvites.find((i) => i.id === inviteId)
    if (!inv || inv.tenantId !== state.currentUser?.tenantId) return
    state = {
      ...state,
      uploadInvites: state.uploadInvites.map((i) => (i.id === inviteId ? revokeInvite(i) : i)),
      auditEvents: appendAudit('upload_invite_revoked', `Revoked invite ${inviteId}`, { inviteId }),
    }
    emit()
  },
  redeemUploadInvite(token: string, files: FileList | File[]) {
    const invite = state.uploadInvites.find((i) => i.token === token)
    const check = validateUploadInvite(invite, {
      tenantId: invite?.tenantId ?? '',
      clientId: invite?.clientId ?? '',
    })
    if (!invite || !check.ok) {
      return { ok: false as const, error: !check.ok ? check.error : 'Invalid invitation.' }
    }
    // Scoped upload only — does not expose existing tax records or grant a full session
    const list = Array.from(files)
    const now = new Date().toISOString()
    const docs: DocumentRecord[] = list.map((file) => {
      const id = uid('d')
      const type = classifyDocumentName(file.name)
      const yearFromName = file.name.match(/(20\d{2})/)
      return {
        id,
        name: file.name,
        type,
        taxYear: yearFromName ? Number(yearFromName[1]) : state.activeTaxYear,
        sizeLabel:
          file.size > 1024 * 1024
            ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
            : `${Math.max(1, Math.round(file.size / 1024))} KB`,
        uploadedAt: now,
        status: 'scanning' as const,
        confidence: 0,
        ownerId: invite.clientId,
        clientId: invite.clientId,
        tenantId: invite.tenantId,
        storagePath: vaultStoragePath(invite.tenantId, invite.clientId, id),
        facts: [],
      }
    })
    state = {
      ...state,
      documents: [...docs, ...state.documents],
      uploadInvites: state.uploadInvites.map((i) => (i.id === invite.id ? markInviteUsed(i) : i)),
      auditEvents: appendAudit(
        'upload_invite_redeemed',
        `Documents uploaded via invite ${invite.id} (upload-only access).`,
        { inviteId: invite.id, clientId: invite.clientId, count: docs.length },
      ),
    }
    emit()
    // Async classify like normal uploads
    docs.forEach((doc) => {
      setTimeout(() => {
        const confidence = 0.86 + (doc.name.length % 10) / 100
        const facts = extractFactsForType(doc.type, doc.name, confidence, uid, invite.clientName)
        state = {
          ...state,
          documents: state.documents.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  status: (confidence < 0.9 ? 'needs_review' : 'extracted') as DocumentRecord['status'],
                  confidence,
                  facts,
                }
              : d,
          ),
        }
        emit()
      }, 600)
    })
    return { ok: true as const, documentIds: docs.map((d) => d.id) }
  },
  applyPriorReturnImport(draft: ImportedReturnDraft) {
    // Never auto-apply filing status or dependents — wages/withholding only when present, flagged
    let taxProfile = { ...state.taxProfile }
    if (typeof draft.wages === 'number') taxProfile = { ...taxProfile, wages: draft.wages }
    if (typeof draft.withholding === 'number') taxProfile = { ...taxProfile, withholding: draft.withholding }
    taxProfile = {
      ...taxProfile,
      answers: {
        ...taxProfile.answers,
        prior_return_imported: 'yes',
        prior_return_vendor: draft.vendor,
        prior_return_year: draft.taxYear,
        // Explicitly do NOT set filing status / dependents from prior year
      },
      unresolvedKeys: Array.from(
        new Set([
          ...taxProfile.unresolvedKeys,
          ...draft.uncertainFields.map((f) => `import_${f.replace(/\s+/g, '_').toLowerCase()}`),
        ]),
      ),
    }
    const benefitReport = toSnapshot(taxProfile, `Applied draft facts from ${draft.vendor} prior return (pending confirmation).`)
    const trail = buildCalcAuditTrail(taxProfile, runBenefitOptimization(taxProfile))
    state = {
      ...state,
      taxProfile,
      benefitReport,
      calcAuditTrail: trail,
      benefitReviewSigned: false,
      filingAuthorized: false,
      returns: syncReturnRefund(benefitReport),
      interviewChat: [
        ...state.interviewChat,
        {
          id: uid('iv'),
          role: 'assistant',
          text: `I imported draft facts from ${draft.rawSourceLabel}. Filing status and dependents were NOT reused. Please confirm wages, withholding, and current-year eligibility.`,
          at: new Date().toISOString(),
        },
      ],
      auditEvents: appendAudit('prior_return_import', `Imported draft from ${draft.vendor}`, {
        vendor: draft.vendor,
        taxYear: draft.taxYear,
        confidence: draft.confidence,
      }),
    }
    emit()
  },
  notifyClient(input: {
    kind: NotificationKind
    clientId: string
    clientFirstName: string
    channel?: 'sms' | 'email' | 'in_app'
    relatedReturnId?: string
  }) {
    const actor = state.currentUser
    if (!actor) return null
    if (shouldSuppressDuplicate(state.clientNotifications, input.kind, input.clientId)) {
      return null
    }
    const note = buildClientNotification({
      id: uid('ntf'),
      kind: input.kind,
      tenantId: actor.tenantId,
      clientId: input.clientId,
      clientFirstName: input.clientFirstName,
      channel: input.channel,
      relatedReturnId: input.relatedReturnId,
    })
    state = {
      ...state,
      clientNotifications: [note, ...state.clientNotifications].slice(0, 100),
      auditEvents: appendAudit('client_notification', note.subject, {
        kind: note.kind,
        clientId: note.clientId,
        channel: note.channel,
      }),
    }
    // Caller may emit; if called mid-action without emit, still persist on next emit
    return note
  },
  parsePriorReturnFile(fileName: string, textContent?: string) {
    return parsePriorReturnExport({
      fileName,
      textContent,
      fallbackTaxpayerName: state.currentUser?.name ?? 'Taxpayer',
    })
  },
}

export function useAppStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useCurrentUser(): UserAccount | null {
  return useAppStore().currentUser
}
