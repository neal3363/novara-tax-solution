import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { HeroVideoBackground } from '../components/HeroVideoBackground'
import { MusicControls } from '../components/MusicControls'
import { VoiceInput } from '../components/VoiceInput'
import { useAmbientAudio } from '../ambient/AmbientAudioContext'
import { detectFilingIntent } from '../engine/conversationIntent'
import { PUBLIC_DEMO_BANNER, isPublicDemoMode } from '../engine/demo/publicDemo'
import { actions } from '../store/useAppStore'
import {
  OFFICE_SUBSCRIPTION_BUSINESS,
  OFFICE_SUBSCRIPTION_PERSONAL,
  OFFICE_SUBSCRIPTION_SELF_EMPLOYED,
  STARTER_INCLUDES,
  TC_BUSINESS_FEE,
  TC_PERSONAL_FEE,
  TP_BUSINESS_FEE,
  TP_PERSONAL_FEE,
  TP_SELF_EMPLOYED_FEE,
  UNLIMITED_CLIENTS_COPY,
  formatMoney,
} from '../data/fees'
import './Landing.css'

const FEATURES: { title: string; body: string; status: 'live' | 'partial' | 'soon' }[] = [
  {
    title: 'AI Document Upload & Extraction',
    body: 'Upload W-2s, 1099s, and IDs — AI extracts the facts so clients confirm values instead of typing tax forms.',
    status: 'live',
  },
  {
    title: 'No Manual Tax Data Entry',
    body: 'Clients speak, type, or upload into one questionnaire. NOVARA fills the working return from answers and documents.',
    status: 'live',
  },
  {
    title: 'Intelligent Tailored Questions',
    body: 'Only asks what still matters for this taxpayer — personal, family, income, business, deductions, and credits.',
    status: 'live',
  },
  {
    title: 'Credits & Deduction Exploration',
    body: 'Comprehensively explores eligible deductions and tax credits, then applies allowable amounts to the live refund projection.',
    status: 'live',
  },
  {
    title: 'Personal & Business Returns',
    body: 'Supports personal and business tax return preparation, including self-employment follow-ups like mileage and QBI screening.',
    status: 'live',
  },
  {
    title: 'Preparers & Tax Offices',
    body: 'Unified workflows for tax clients, independent preparers, and offices — inbox, clients, pipeline, and transparent pricing.',
    status: 'live',
  },
  {
    title: 'Secure Document Management',
    body: 'Session-scoped Tax Vault keeps uploaded documents and extracted facts organized for review.',
    status: 'live',
  },
  {
    title: 'Human Review Before E-File',
    body: 'Human review and verification remain required before electronic filing — NOVARA assists; it does not skip legal checks.',
    status: 'live',
  },
  {
    title: 'Federal & State Returns',
    body: 'Federal return workflow is in the demo. Broader state coverage expands as jurisdictions are enabled.',
    status: 'partial',
  },
  {
    title: 'Filing Status Assistance',
    body: 'Helps evaluate Single, MFJ, MFS, Head of Household, and Qualifying Surviving Spouse eligibility.',
    status: 'live',
  },
  {
    title: 'Electronic Signatures',
    body: 'Demo e-sign and approval workflow before simulated transmission.',
    status: 'live',
  },
  {
    title: 'Return Status Tracking',
    body: 'Taxpayer home and office pipeline show preparation and filing progress.',
    status: 'live',
  },
]

const COMPARE = [
  ['Manual form filling', 'Document upload + AI extraction'],
  ['Guess which credits apply', 'Proactive tax-benefit discovery interview'],
  ['Stop when the return “looks done”', 'Stop only after benefit review is complete'],
  ['Separate tools for offices', 'Unified taxpayer + preparer + office OS'],
  ['Opaque software fees', 'Transparent subscription vs per-return vs bank fees'],
]

const INTENT_KEY = 'novara-pending-intent'

export function Landing() {
  const ambient = useAmbientAudio()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [typed, setTyped] = useState('')
  const [pendingVoice, setPendingVoice] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)

  function unlockAudio() {
    ambient.enterAndPlay()
  }

  function goToPrepare(opts?: { intent?: string; upload?: boolean }) {
    unlockAudio()
    if (opts?.intent) {
      try {
        sessionStorage.setItem(INTENT_KEY, opts.intent)
      } catch {
        /* ignore */
      }
    }
    const q = opts?.upload ? '?upload=1' : ''
    const dest = `/app/taxpayer/prepare${q}`
    // Public host: open the questionnaire directly — do not send people through
    // Cursor apps-gate (that path shows a dead “page doesn’t exist” screen).
    if (!import.meta.env.DEV) {
      actions.loginAsPublicGuest()
      navigate(dest)
      return
    }
    navigate(`/login?next=${encodeURIComponent(dest)}`)
  }

  function submitIntent(raw: string) {
    const text = raw.trim()
    if (!text) {
      goToPrepare()
      return
    }
    const cmd = detectFilingIntent(text)
    const payload =
      cmd.type === 'intent'
        ? JSON.stringify({ text, intent: cmd.intent, taxYear: cmd.taxYear, clarify: cmd.clarify })
        : JSON.stringify({ text })
    goToPrepare({ intent: payload })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDrag(false)
    unlockAudio()
    // Files can't cross login easily — stash flag and open prepare upload
    goToPrepare({ upload: true })
  }

  const draft = pendingVoice ?? typed

  return (
    <div className="app-shell home">
      <section className="landing-hero">
        <HeroVideoBackground />
        <div className="container hero-shell">
          <nav className="landing-nav">
            <div className="landing-brand">
              <BrandMark size={44} />
              <div>
                <strong className="brand">NOVARA</strong>
                <span>Tax OS</span>
              </div>
            </div>
            <div className="hero-nav-actions">
              <MusicControls compact className="landing-music" />
              <a className="nav-text" href="#how">
                See How It Works
              </a>
              <Link className="btn btn-secondary landing-ghost" to="/login?intent=professional">
                Tax pros
              </Link>
              <button className="btn btn-primary hero-solid" type="button" onClick={() => goToPrepare()}>
                Get Started
              </button>
            </div>
          </nav>

          <div className="hero-copy">
            <p className="hero-brand brand rise">NOVARA TAX OS</p>
            <h1 className="rise rise-delay-1">The Future of Tax Preparation Is Here.</h1>
            <p className="hero-tagline rise rise-delay-2">Upload. Answer. Done.</p>
            <p className="lead rise rise-delay-2">
              Experience intelligent, AI-powered tax preparation designed to eliminate manual data entry, explore
              eligible tax deductions and credits, and help maximize lawful tax refunds.
            </p>

            <div className="hero-actions rise rise-delay-2">
              <button className="btn btn-primary hero-solid" type="button" onClick={() => goToPrepare()}>
                Get Started
              </button>
              <a className="btn btn-secondary landing-ghost" href="#how">
                See How It Works
              </a>
            </div>

            <div
              className={`hero-compose rise rise-delay-3 ${drag ? 'drag' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
            >
              <label className="hero-compose-label" htmlFor="heroIntent">
                Or speak, type, or upload to begin
              </label>
              <input
                id="heroIntent"
                className="hero-compose-input"
                value={draft}
                onChange={(e) => {
                  setPendingVoice(null)
                  setTyped(e.target.value)
                }}
                onFocus={unlockAudio}
                placeholder='e.g. “I’m filing my personal taxes” or “I’m amending my 2023 return”'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitIntent(draft)
                }}
              />
              <div className="hero-compose-actions">
                <VoiceInput
                  labelStart="Speak"
                  labelStop="Stop"
                  onTranscript={(text) => {
                    unlockAudio()
                    setPendingVoice(text)
                    setTyped(text)
                  }}
                />
                <button
                  className="btn btn-secondary landing-ghost"
                  type="button"
                  onClick={() => {
                    unlockAudio()
                    fileRef.current?.click()
                  }}
                >
                  Upload Documents
                </button>
                <button
                  className="btn btn-primary hero-solid"
                  type="button"
                  onClick={() => submitIntent(draft)}
                >
                  {draft.trim() ? 'Continue' : 'Get Started'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  hidden
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.json"
                  onChange={() => goToPrepare({ upload: true })}
                />
              </div>
              <p className="hero-compose-note">
                One entrance — speak, type, or upload into the same questionnaire. Refunds are maximized only when
                answers and documents support them; human review is required before e-file.
              </p>
            </div>
          </div>
        </div>
      </section>

      {isPublicDemoMode() && (
        <div className="container" style={{ paddingTop: '0.85rem', paddingBottom: '0.25rem' }}>
          <div className="sample-banner" role="status">
            {PUBLIC_DEMO_BANNER}
          </div>
        </div>
      )}

      <section className="section" id="how">
        <div className="container">
          <p className="landing-kicker">How NOVARA works</p>
          <h2>One questionnaire. Three ways to answer.</h2>
          <p className="section-lead">
            Speak, type, or upload into the same return. Tabs show what’s complete and what’s still unanswered — then
            NOVARA explores eligible credits before you review and file.
          </p>
          <div className="steps-grid">
            {[
              ['STEP 1 — TELL OR UPLOAD', 'Say what you’re filing, or drop W-2s and IDs. Either path opens the same workspace.'],
              ['STEP 2 — QUESTIONNAIRE TABS', 'Personal, filing status, dependents, income, business, deductions, credits, review.'],
              ['STEP 3 — FILL GAPS ONLY', 'NOVARA asks what’s still missing. Green = answered, orange = still needed.'],
              ['STEP 4 — REVIEW & FILE', 'Confirm the estimate, sign, and complete preparation without blank tax forms.'],
            ].map(([t, b]) => (
              <div key={t}>
                <h3>{t}</h3>
                <p>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="container">
          <p className="landing-kicker">Why NOVARA</p>
          <h2>Professional tax technology, exceptionally simple</h2>
          <p className="section-lead">
            Built for taxpayers, preparers, and offices — AI-assisted preparation with secure documents and human
            verification before electronic filing.
          </p>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="feature-card">
                <div className="feature-card-top">
                  <h3>{f.title}</h3>
                  <span className={`badge ${f.status === 'live' ? 'badge-ok' : 'badge-neutral'}`}>
                    {f.status === 'live' ? 'Live' : f.status === 'partial' ? 'Partial' : 'Soon'}
                  </span>
                </div>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="professionals">
        <div className="container">
          <p className="landing-kicker">For professionals</p>
          <h2>TC · TP · Office pricing</h2>
          <p className="section-lead">
            Transparent fees for taxpayers, independent preparers, and offices. {UNLIMITED_CLIENTS_COPY}.
          </p>
          <div className="pricing-grid">
            <article className="price-card">
              <h3>Tax Client</h3>
              <p>
                Personal {formatMoney(TC_PERSONAL_FEE)} · Business {formatMoney(TC_BUSINESS_FEE)}
              </p>
              <ul>
                {STARTER_INCLUDES.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </article>
            <article className="price-card">
              <h3>Tax Professional</h3>
              <p>
                Pay per return · Personal {formatMoney(TP_PERSONAL_FEE)} · Self-employed {formatMoney(TP_SELF_EMPLOYED_FEE)}{' '}
                · Business entity {formatMoney(TP_BUSINESS_FEE)} · No annual subscription
              </p>
            </article>
            <article className="price-card">
              <h3>Office</h3>
              <p>
                Per year · Personal {formatMoney(OFFICE_SUBSCRIPTION_PERSONAL)} · Self-Employed{' '}
                {formatMoney(OFFICE_SUBSCRIPTION_SELF_EMPLOYED)} · Business {formatMoney(OFFICE_SUBSCRIPTION_BUSINESS)} ·
                Covered returns included
              </p>
            </article>
          </div>
          <div className="compare-grid">
            {COMPARE.map(([a, b]) => (
              <div key={a} className="compare-row">
                <span>{a}</span>
                <strong>{b}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
