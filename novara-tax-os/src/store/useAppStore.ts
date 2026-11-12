import { useSyncExternalStore } from 'react'
import { DEMO_USERS, SEED_DOCS, SEED_RETURNS, SMART_QUESTIONS } from '../data/seed'
import type {
  AppState,
  AuditEvent,
  DocumentRecord,
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
import {
  applyFilingStatusAnswer,
  conversationalReply,
  nextBenefitDiscoveryTurn,
  nextFilingStatusTurn,
  syncProfileFromDocuments,
} from '../engine/smartInterview'
import {
  classifyDocumentName,
  detectDocumentConflicts,
  extractFactsForType,
  findDuplicateUploads,
  plainLanguageExtractionSummary,
} from '../engine/documentProcessing'
import type { BenefitSnapshot } from '../data/types'

/** Role preference only — never store tax demo payloads in localStorage */
const ROLE_KEY = 'novara-tax-os-role'
/** Session-scoped demo state (clears when the tab closes) */
const SESSION_KEY = 'novara-tax-os-session-v6'

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

function recordInterviewAnswer(mapsTo: string, prompt: string, answer: string | number) {
  const existing = state.interviewAnswers.filter((a) => a.mapsTo !== mapsTo)
  return [
    ...existing,
    {
      id: uid(`ans-${mapsTo}`),
      mapsTo,
      prompt,
      answer,
      at: new Date().toISOString(),
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
  let dependents = state.taxProfile.dependents
  if (removed.has('has_qualifying_person') || removed.has('has_dependents') || removed.has('has_child')) {
    if (!answers.has_dependents && !answers.has_qualifying_person) {
      dependents = []
    }
  }

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
  const report = runBenefitOptimization(profile)
  const prev = state.benefitReport
  const delta = report.projectedRefund - (prev?.projectedRefund ?? report.baseRefund)
  let lastChangeNote = reason ?? 'Tax benefits rechecked against your latest documents and answers.'
  if (prev) {
    const direction = delta === 0 ? 'stayed the same' : delta > 0 ? `went up by ${money(delta)}` : `went down by ${money(Math.abs(delta))}`
    lastChangeNote = `${reason ? reason + ' ' : ''}Your estimated refund ${direction}. Verified savings ${money(report.verifiedSavings)}; possible (not yet verified) ${money(report.potentialSavings)}.`
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
    lastRunAt: new Date().toISOString(),
    lastChangeNote,
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
  interviewChat: [
    {
      id: 'iv0',
      role: 'assistant',
      text: 'Upload your documents first — ID, W-2s, 1099s, and supporting forms. I’ll extract what I can and only ask what’s still missing.',
      at: new Date().toISOString(),
    },
  ],
  interviewAnswers: [],
  auditEvents: [],
  uploadIssues: [],
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
    sessionStorage.removeItem('novara-tax-os-session-v3')
    sessionStorage.removeItem('novara-tax-os-session-v4')
    sessionStorage.removeItem('novara-tax-os-session-v5')

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
        interviewChat: parsed.interviewChat?.length ? parsed.interviewChat : state.interviewChat,
        interviewAnswers: parsed.interviewAnswers ?? [],
        auditEvents: parsed.auditEvents ?? [],
        uploadIssues: parsed.uploadIssues ?? [],
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
    const classified = list.map((file) => ({
      file,
      type: classifyDocumentName(file.name),
      name: file.name,
    }))
    const dupes = findDuplicateUploads(state.documents, classified)

    const docs: DocumentRecord[] = classified.map(({ file, type }) => ({
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
    }))

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
        state = {
          ...state,
          documents,
          taxProfile,
          benefitReport,
          uploadIssues: [...conflicts, ...state.uploadIssues.filter((u) => u.kind === 'duplicate')].slice(0, 40),
          entryPlan: buildEntryPlan(documents),
          entryPlanStatus: 'awaiting_approval',
          returns: syncReturnRefund(benefitReport),
          auditEvents: appendAudit(
            'document_extract',
            `Extracted ${doc.type} fields into the return draft. Sensitive IDs masked.`,
            { docType: doc.type },
          ),
        }
        emit()
        if (i === docs.length - 1) {
          const chat = {
            id: uid('iv'),
            role: 'assistant' as const,
            text: 'Extraction complete. Confirm the details below — I won’t ask you to re-type wages, withholding, tuition, or childcare amounts already on your documents. Correct only what’s missing or wrong.',
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
    const filing = nextFilingStatusTurn(taxProfile)
    const chat = {
      id: uid('iv'),
      role: 'assistant' as const,
      text: filing
        ? `${filing.aiLead} ${filing.prompt}`
        : 'Filing status looks complete from prior answers. Let’s check for tax benefits next.',
      at: new Date().toISOString(),
    }
    state = {
      ...state,
      taxProfile,
      benefitReport,
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

    const filingKeys = ['married_dec31', 'married_filing_plan', 'has_qualifying_person', 'maintained_home']
    let taxProfile: TaxpayerProfile
    if (filingKeys.includes(mapsTo)) {
      taxProfile = applyFilingStatusAnswer(state.taxProfile, mapsTo, strVal)
    } else {
      const normalized =
        strVal === 'Yes' || strVal === 'yes' ? 'yes' : strVal === 'No' || strVal === 'no' ? 'no' : value
      taxProfile = applyAnswer(state.taxProfile, mapsTo, normalized)
    }

    const questionPrompt = prompt ?? state.interviewAnswers.find((a) => a.mapsTo === mapsTo)?.prompt ?? mapsTo

    const reply = conversationalReply(mapsTo, strVal, taxProfile)
    const benefitReport = toSnapshot(taxProfile, `You confirmed “${strVal}” for a tax interview question.`)

    const filingNext = nextFilingStatusTurn(taxProfile)
    const benefitNext = filingNext ? null : nextBenefitDiscoveryTurn(taxProfile)

    const assistantMsgs = [
      {
        id: uid('iv'),
        role: 'assistant' as const,
        text: `${reply} ${benefitReport.lastChangeNote ?? ''}`,
        at: new Date().toISOString(),
      },
    ]

    if (filingNext) {
      assistantMsgs.push({
        id: uid('iv'),
        role: 'assistant',
        text: `${filingNext.aiLead} ${filingNext.prompt}`,
        at: new Date().toISOString(),
      })
    } else if (benefitNext) {
      assistantMsgs.push({
        id: uid('iv'),
        role: 'assistant',
        text: benefitNext.aiLead === benefitNext.prompt ? benefitNext.prompt : `${benefitNext.aiLead}`,
        at: new Date().toISOString(),
      })
      if (benefitNext.aiLead !== benefitNext.prompt) {
        assistantMsgs.push({
          id: uid('iv'),
          role: 'assistant',
          text: benefitNext.prompt,
          at: new Date().toISOString(),
        })
      }
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
      returns: syncReturnRefund(benefitReport),
      interviewChat: [...state.interviewChat, userMsg, ...assistantMsgs],
      interviewAnswers: recordInterviewAnswer(mapsTo, questionPrompt, value),
      auditEvents: appendAudit('interview_answer', `Confirmed interview answer for ${mapsTo} (answer text omitted from audit when sensitive).`, {
        mapsTo,
      }),
      prepStep: filingNext || benefitNext ? 2 : state.prepStep,
    }
    emit()

    // Do not auto-jump past interview — taxpayer presses Calculate when ready
  },
  editInterviewAnswer(mapsTo: string) {
    const cleared = clearAnswerTree(mapsTo)
    const benefitReport = toSnapshot(cleared.taxProfile)
    const filingNext = nextFilingStatusTurn(cleared.taxProfile)
    const benefitNext = filingNext ? null : nextBenefitDiscoveryTurn(cleared.taxProfile)
    const reopen = filingNext ?? benefitNext
    const chat = {
      id: uid('iv'),
      role: 'assistant' as const,
      text: reopen
        ? `Let’s update that answer. ${reopen.prompt}`
        : 'Answer cleared. Continue when you are ready.',
      at: new Date().toISOString(),
    }
    const inPrepareInterview = state.prepStep === 2 || state.prepStep === 3 || state.prepStep === 4
    state = {
      ...state,
      ...cleared,
      benefitReport,
      benefitReviewSigned: false,
      returns: syncReturnRefund(benefitReport),
      prepStep: inPrepareInterview ? 2 : state.prepStep,
      interviewChat: [...state.interviewChat, chat],
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
            feeSnapshot: [{ label: 'Consumer basic W-2', amount: CONSUMER_PRICES[0].amount, status: 'provisional' }],
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
      interviewChat: [
        {
          id: 'iv0',
          role: 'assistant',
          text: 'Demo reset. Upload documents first — I’ll extract what I can, then ask only what’s still needed.',
          at: new Date().toISOString(),
        },
      ],
      interviewAnswers: [],
      auditEvents: [],
      uploadIssues: [],
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
