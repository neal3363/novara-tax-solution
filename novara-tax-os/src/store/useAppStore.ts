import { useSyncExternalStore } from 'react'
import { DEMO_USERS, SEED_DOCS, SEED_RETURNS, SMART_QUESTIONS } from '../data/seed'
import type {
  AppState,
  DocumentRecord,
  DocType,
  EntryPlanLine,
  Message,
  PreEntryNote,
  ReturnState,
  Role,
  TaxReturn,
  UserAccount,
} from '../data/types'
import { CONSUMER_PRICES, TP_FEES } from '../data/fees'
import {
  applyAnswer,
  defaultProfile,
  runBenefitOptimization,
  type TaxpayerProfile,
} from '../engine/benefitOptimizer'
import type { BenefitSnapshot } from '../data/types'

/** Role preference only — never store tax demo payloads in localStorage */
const ROLE_KEY = 'novara-tax-os-role'
/** Session-scoped demo state (clears when the tab closes) */
const SESSION_KEY = 'novara-tax-os-session-v3'

function toSnapshot(profile: TaxpayerProfile): BenefitSnapshot {
  const report = runBenefitOptimization(profile)
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
    lastRunAt: new Date().toISOString(),
  }
}

function syncReturnRefund(report: BenefitSnapshot) {
  return state.returns.map((r) =>
    r.id === state.activeReturnId || (r.clientId === (state.currentUser?.id ?? 'u-tax') && r.taxYear === 2025)
      ? {
          ...r,
          refundOrOwe: report.projectedRefund,
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
  hydrated: false,
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
  persist()
}

function persist() {
  if (!state.hydrated || typeof window === 'undefined') return
  try {
    if (state.currentUser) {
      localStorage.setItem(ROLE_KEY, state.currentUser.role)
    } else {
      localStorage.removeItem(ROLE_KEY)
    }
    const { hydrated: _, currentUser: __, ...sessionRest } = state
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionRest))
  } catch {
    /* ignore quota */
  }
}

function hydrate() {
  if (state.hydrated || typeof window === 'undefined') return
  try {
    // Migrate away from older plaintext localStorage payload
    localStorage.removeItem('novara-tax-os-v1')
    sessionStorage.removeItem('novara-tax-os-session-v2')

    const role = localStorage.getItem(ROLE_KEY) as Role | null
    const sessionRaw = sessionStorage.getItem(SESSION_KEY)
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw) as Omit<AppState, 'currentUser'>
      const taxProfile = parsed.taxProfile ?? defaultProfile()
      const benefitReport = parsed.benefitReport ?? toSnapshot(taxProfile)
      state = {
        ...state,
        ...parsed,
        taxProfile,
        benefitReport,
        benefitReviewSigned: parsed.benefitReviewSigned ?? false,
        currentUser: role ? (DEMO_USERS.find((u) => u.role === role) ?? null) : null,
        hydrated: true,
      }
    } else {
      const taxProfile = defaultProfile()
      state = {
        ...state,
        taxProfile,
        benefitReport: toSnapshot(taxProfile),
        currentUser: role ? (DEMO_USERS.find((u) => u.role === role) ?? null) : null,
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
  return state
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function classifyName(name: string): DocType {
  const n = name.toLowerCase()
  if (n.includes('w-2') || n.includes('w2')) return 'W-2'
  if (n.includes('1099')) return '1099-NEC'
  if (n.includes('1098')) return '1098'
  if (n.includes('pl') || n.includes('p&l') || n.includes('profit')) return 'P&L'
  if (n.includes('trial')) return 'Trial Balance'
  if (n.includes('bank')) return 'Bank Statement'
  if (n.includes('id') || n.includes('license') || n.includes('passport')) return 'ID'
  if (n.includes('1040') || n.includes('prior')) return 'Prior Return'
  return 'Other'
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export const actions = {
  loginAs(role: Role) {
    const user = DEMO_USERS.find((u) => u.role === role) ?? DEMO_USERS[0]
    state = { ...state, currentUser: user }
    emit()
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
    const lower = prompt.toLowerCase()
    let reply =
      'I’ve reviewed your authorized documents and return state. Ask about refund, missing docs, the entry plan, or next step.'
    if (lower.includes('refund')) {
      reply =
        'Your draft estimate uses verified wages and withholding. Tap any number to see provenance. Not a guarantee until rules engine + preparer approval complete.'
    } else if (lower.includes('missing') || lower.includes('document')) {
      reply =
        'Pre-Entry Notes: possible missing 1099-INT from First Harbor Bank, and one 1099-NEC line needs confirmation.'
    } else if (lower.includes('plan') || lower.includes('approve') || lower.includes('enter')) {
      reply =
        'Filed-style flow: NOVARA reads documents → you approve the data-entry plan (correct or remove lines) → then values can be entered. Nothing is written without approval.'
    } else if (lower.includes('sign') || lower.includes('file')) {
      reply =
        'Filing gates require verified facts, cleared blocking diagnostics, required signatures/consents, and valid credentials. AI cannot transmit returns.'
    } else if (lower.includes('business') || lower.includes('1120') || lower.includes('1065')) {
      reply =
        'Business returns need the business-enabled office tier, TP business surcharge ($239.98), or direct-consumer business service.'
    }
    setTimeout(() => actions.addMessage('assistant', reply), 450)
  },
  uploadFiles(files: FileList | File[]) {
    const list = Array.from(files)
    const now = new Date().toISOString()
    const ownerId = state.currentUser?.id ?? 'u-tax'
    const docs: DocumentRecord[] = list.map((file) => {
      const type = classifyName(file.name)
      return {
        id: uid('d'),
        name: file.name,
        type,
        taxYear: 2025,
        sizeLabel:
          file.size > 1024 * 1024
            ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
            : `${Math.max(1, Math.round(file.size / 1024))} KB`,
        uploadedAt: now,
        status: 'scanning',
        confidence: 0,
        ownerId,
        facts: [],
      }
    })
    state = {
      ...state,
      documents: [...docs, ...state.documents],
      prepStep: Math.max(state.prepStep, 1),
      entryPlanStatus: 'draft',
    }
    emit()
    actions.addMessage('assistant', `Received ${docs.length} file${docs.length === 1 ? '' : 's'}. Reading every document…`)

    docs.forEach((doc, i) => {
      setTimeout(() => {
        const confidence = 0.84 + Math.random() * 0.14
        const facts =
          doc.type === 'W-2'
            ? [
                { id: uid('f'), label: 'Wages (Box 1)', value: '$64,200.00', sourcePage: 1, confidence, verified: false },
                {
                  id: uid('f'),
                  label: 'Federal withheld',
                  value: '$7,110.00',
                  sourcePage: 1,
                  confidence: confidence - 0.02,
                  verified: false,
                },
              ]
            : doc.type === '1099-NEC'
              ? [
                  {
                    id: uid('f'),
                    label: 'Nonemployee compensation',
                    value: '$3,800.00',
                    sourcePage: 1,
                    confidence,
                    verified: false,
                  },
                ]
              : [
                  {
                    id: uid('f'),
                    label: 'Detected label',
                    value: doc.name.replace(/\.[^.]+$/, ''),
                    sourcePage: 1,
                    confidence,
                    verified: false,
                  },
                ]

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
        state = {
          ...state,
          documents,
          entryPlan: buildEntryPlan(documents),
          entryPlanStatus: 'awaiting_approval',
        }
        emit()
        if (i === docs.length - 1) {
          actions.addMessage(
            'assistant',
            'Extraction complete. Review the data-entry plan — every value links to its source box. Approve before anything is entered.',
          )
        }
      }, 900 + i * 500)
    })
  },
  verifyFact(docId: string, factId: string) {
    state = {
      ...state,
      documents: state.documents.map((d) =>
        d.id === docId
          ? { ...d, facts: d.facts.map((f) => (f.id === factId ? { ...f, verified: true } : f)), status: 'verified' }
          : d,
      ),
    }
    emit()
  },
  completeQuestions() {
    const refund = 1840 + Math.round(Math.random() * 400)
    const returns = state.returns.map((r) =>
      r.clientId === (state.currentUser?.id ?? 'u-tax') && r.taxYear === 2025
        ? {
            ...r,
            state: 'Client Review' as ReturnState,
            readiness: 92,
            refundOrOwe: refund,
            feeSnapshot: [{ label: 'Consumer basic W-2', amount: CONSUMER_PRICES[0].amount, status: 'provisional' }],
            updatedAt: new Date().toISOString(),
          }
        : r,
    )
    state = { ...state, returns, prepStep: 3 }
    emit()
    actions.addMessage(
      'assistant',
      `Your Result is ready: estimated refund ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(refund)}. Deterministic engine + readiness score.`,
    )
  },
  signAndFile() {
    const returns = state.returns.map((r) =>
      r.clientId === (state.currentUser?.id ?? 'u-tax') && r.taxYear === 2025
        ? {
            ...r,
            state: 'Transmitted' as ReturnState,
            readiness: 100,
            updatedAt: new Date().toISOString(),
          }
        : r,
    )
    state = { ...state, returns, prepStep: 5 }
    emit()
    actions.addMessage('system', 'E-sign captured. Return transmitted through integrated provider adapter.')
    setTimeout(() => {
      state = {
        ...state,
        returns: state.returns.map((r) =>
          r.clientId === (state.currentUser?.id ?? 'u-tax') && r.taxYear === 2025
            ? { ...r, state: 'Accepted' as ReturnState }
            : r,
        ),
        prepStep: 5,
      }
      emit()
      actions.addMessage('assistant', 'Accepted. Final records are in your Document Manager. I’ll stay with you year-round.')
    }, 1600)
  },
  advanceReturn(id: string, next: ReturnState) {
    state = {
      ...state,
      returns: state.returns.map((r) => (r.id === id ? { ...r, state: next, updatedAt: new Date().toISOString() } : r)),
    }
    emit()
  },
  createBusinessReturn(clientName: string, returnType: TaxReturn['returnType']) {
    const fee = TP_FEES.find((f) => f.id === 'tp-business')!
    const ret: TaxReturn = {
      id: uid('r'),
      clientName,
      clientId: uid('c'),
      taxYear: 2025,
      returnType,
      state: 'Intake Started',
      readiness: 18,
      refundOrOwe: 0,
      preparerId: state.currentUser?.id,
      isBusiness: true,
      feeSnapshot: [{ label: fee.label, amount: fee.amount, status: fee.status }],
      updatedAt: new Date().toISOString(),
    }
    state = { ...state, returns: [ret, ...state.returns], activeReturnId: ret.id }
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
    const benefitReport = toSnapshot(state.taxProfile)
    state = {
      ...state,
      benefitReport,
      benefitReviewSigned: false,
      returns: syncReturnRefund(benefitReport),
    }
    emit()
    actions.addMessage(
      'assistant',
      `Tax Benefit Optimization rerun complete (${benefitReport.ruleVersion}). Verified savings ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(benefitReport.verifiedSavings)}; potential ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(benefitReport.potentialSavings)}.`,
    )
  },
  answerBenefitQuestion(mapsTo: string, value: string | number | boolean) {
    const taxProfile = applyAnswer(state.taxProfile, mapsTo, value)
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
  markBenefitUnresolved(mapsTo: string) {
    const taxProfile = {
      ...state.taxProfile,
      answers: { ...state.taxProfile.answers, [mapsTo]: 'unresolved' },
      unresolvedKeys: Array.from(new Set([...state.taxProfile.unresolvedKeys, mapsTo])),
    }
    const benefitReport = toSnapshot(taxProfile)
    state = { ...state, taxProfile, benefitReport, benefitReviewSigned: false }
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
    state = {
      ...state,
      benefitReport,
      benefitReviewSigned: true,
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
  resetDemo() {
    localStorage.removeItem('novara-tax-os-v1')
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem('novara-tax-os-session-v2')
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
      hydrated: true,
    }
    emit()
  },
}

export function useAppStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useCurrentUser(): UserAccount | null {
  return useAppStore().currentUser
}
