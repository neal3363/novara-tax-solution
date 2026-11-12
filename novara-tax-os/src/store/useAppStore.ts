import { useSyncExternalStore } from 'react'
import { DEMO_USERS, SEED_DOCS, SEED_RETURNS, SMART_QUESTIONS } from '../data/seed'
import type {
  AppState,
  DocumentRecord,
  DocType,
  Message,
  ReturnState,
  Role,
  TaxReturn,
  UserAccount,
} from '../data/types'
import { CONSUMER_PRICES, TP_FEES } from '../data/fees'

const STORAGE_KEY = 'novara-tax-os-v1'

type Store = AppState & {
  hydrated: boolean
}

let state: Store = {
  currentUser: null,
  documents: SEED_DOCS,
  returns: SEED_RETURNS,
  messages: [
    {
      id: 'm0',
      role: 'assistant',
      text: 'Hi — I’m your NOVARA Tax AI. Upload documents and I’ll classify, extract, and guide your return. I propose; the rules engine calculates.',
      at: new Date().toISOString(),
    },
  ],
  prepStep: 0,
  questions: SMART_QUESTIONS,
  vaultFilter: 'all',
  hydrated: false,
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
  persist()
}

function persist() {
  if (!state.hydrated) return
  const { hydrated: _, ...rest } = state
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
  } catch {
    /* ignore quota */
  }
}

function hydrate() {
  if (state.hydrated || typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      state = { ...state, ...parsed, hydrated: true }
    } else {
      state = { ...state, hydrated: true }
    }
  } catch {
    state = { ...state, hydrated: true }
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
    state = { ...state, currentUser: user, prepStep: role === 'taxpayer' ? state.prepStep : state.prepStep }
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
      'I’ve reviewed your authorized documents and return state. Tell me what you’d like clarified — refund, missing docs, or next step.'
    if (lower.includes('refund')) {
      reply =
        'Your current draft shows an estimated refund based on verified wages and withholding. Tap any number in Your Result to see provenance. This is not a guarantee until the rules engine and preparer review complete.'
    } else if (lower.includes('missing') || lower.includes('document')) {
      reply =
        'Missing Document Radar: last year you had a 1099-INT from First Harbor Bank. Upload it or confirm the account closed. You also have one 1099-NEC fact awaiting verification.'
    } else if (lower.includes('sign') || lower.includes('file')) {
      reply =
        'Filing gates require: verified facts, cleared blocking diagnostics, required signatures/consents, and valid credentials. AI cannot transmit returns.'
    } else if (lower.includes('business') || lower.includes('1120') || lower.includes('1065')) {
      reply =
        'Business returns need the business-enabled office tier, TP business surcharge ($239.98), or direct-consumer business service. Upload P&L, trial balance, ownership, and prior-year docs.'
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
        sizeLabel: file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`,
        uploadedAt: now,
        status: 'scanning',
        confidence: 0,
        ownerId,
        facts: [],
      }
    })
    state = { ...state, documents: [...docs, ...state.documents], prepStep: Math.max(state.prepStep, 1) }
    emit()
    actions.addMessage('assistant', `Received ${docs.length} file${docs.length === 1 ? '' : 's'}. Scanning, classifying, and extracting…`)

    // Simulate pipeline
    docs.forEach((doc, i) => {
      setTimeout(() => {
        const confidence = 0.84 + Math.random() * 0.14
        const facts =
          doc.type === 'W-2'
            ? [
                { id: uid('f'), label: 'Wages (Box 1)', value: '$64,200.00', sourcePage: 1, confidence, verified: false },
                { id: uid('f'), label: 'Federal withheld', value: '$7,110.00', sourcePage: 1, confidence: confidence - 0.02, verified: false },
              ]
            : doc.type === '1099-NEC'
              ? [{ id: uid('f'), label: 'Nonemployee compensation', value: '$3,800.00', sourcePage: 1, confidence, verified: false }]
              : [{ id: uid('f'), label: 'Detected label', value: doc.name.replace(/\.[^.]+$/, ''), sourcePage: 1, confidence, verified: false }]

        state = {
          ...state,
          documents: state.documents.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  status: confidence < 0.9 ? 'needs_review' : 'extracted',
                  confidence,
                  facts,
                }
              : d,
          ),
        }
        emit()
        if (i === docs.length - 1) {
          actions.addMessage(
            'assistant',
            'Classification complete. Review low-confidence fields, then answer a few smart questions — you should not retype numbers already on your documents.',
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
      `Your Result is ready: estimated refund ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(refund)}. Deterministic engine + readiness score. Approve & sign when ready.`,
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
    actions.addMessage('system', 'E-sign captured. Return transmitted through integrated provider adapter. Watching for acknowledgment…')
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
      actions.addMessage('assistant', 'Accepted. Your return and source documents are in the Tax Vault. I’ll stay with you year-round for notices and next year’s head start.')
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
    state = { ...state, returns: [ret, ...state.returns] }
    emit()
  },
  resetDemo() {
    localStorage.removeItem(STORAGE_KEY)
    state = {
      currentUser: state.currentUser,
      documents: SEED_DOCS,
      returns: SEED_RETURNS,
      messages: [
        {
          id: 'm0',
          role: 'assistant',
          text: 'Demo reset. Upload your documents — I’ll handle classification and draft preparation.',
          at: new Date().toISOString(),
        },
      ],
      prepStep: 0,
      questions: SMART_QUESTIONS,
      vaultFilter: 'all',
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
