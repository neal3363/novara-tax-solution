import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import {
  BANKING_FEES_NOTE,
  OFFICE_SUBSCRIPTION_FLOOR,
  OFFICE_SUBSCRIPTION_HIGH,
  PRICING,
  TIER_REGISTRATION_CARDS,
  TP_REGISTRATION_FEE,
  UNLIMITED_CLIENTS_COPY,
  formatMoney,
  type AccountTier,
} from '../data/fees'
import { isValidEfinFormat, isValidEinFormat, isValidPtinFormat } from '../engine/credentials'
import { actions } from '../store/useAppStore'
import './Login.css'
import './Register.css'

type Step = 'choose' | 'form' | 'pay' | 'done'

function ProductionRegisterGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  useEffect(() => {
    if (!import.meta.env.DEV) navigate('/login', { replace: true })
  }, [navigate])
  if (!import.meta.env.DEV) {
    return (
      <div className="login-page container">
        <p className="muted">Registration is available in the local sandbox. Opening your verified workspace…</p>
      </div>
    )
  }
  return children
}

export function RegisterHub() {
  return (
    <ProductionRegisterGate>
    <div className="login-page register-page">
      <div className="container login-wrap">
        <div className="login-brand rise">
          <BrandMark size={52} />
          <div>
            <h1 className="brand">NOVARA</h1>
            <p>
              Choose your account tier. TP requires a PTIN. Office requires an EFIN. Manually entered credentials are
              never treated as verified without a validation process.
            </p>
          </div>
        </div>
        <div className="tier-pick-grid">
          {TIER_REGISTRATION_CARDS.map((card) => (
            <Link key={card.tier} className="tier-pick panel rise" to={card.path}>
              <p className="eyebrow">{card.subtitle}</p>
              <strong>{card.title}</strong>
              {'badge' in card && card.badge ? <span className="badge badge-ok">{card.badge}</span> : null}
              <div className="tier-price-block">
                <span>
                  {card.registrationLabel}:{' '}
                  {card.registrationRange
                    ? `${formatMoney(card.registrationRange[0])}–${formatMoney(card.registrationRange[1])}`
                    : formatMoney(card.registrationAmount ?? 0)}
                </span>
                {card.lines.map((l) => (
                  <span key={l.label}>
                    {l.label}: {formatMoney(l.amount)}
                  </span>
                ))}
              </div>
              <em className="role-finds">Continue registration →</em>
            </Link>
          ))}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Already have a demo account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
    </ProductionRegisterGate>
  )
}

export function RegisterFlow() {
  const { tier: tierParam } = useParams()
  const navigate = useNavigate()
  const tier = (tierParam?.toUpperCase() === 'TC'
    ? 'TC'
    : tierParam?.toUpperCase() === 'TP'
      ? 'TP'
      : tierParam?.toLowerCase() === 'office'
        ? 'Office'
        : null) as AccountTier | null

  const card = TIER_REGISTRATION_CARDS.find((c) => c.tier === tier)
  const [step, setStep] = useState<Step>('form')
  const [officePlan, setOfficePlan] = useState<899 | 1250>(899)
  const [formError, setFormError] = useState<string | null>(null)
  const [credNote, setCredNote] = useState<string | null>(null)
  const [form, setForm] = useState({
    legalName: '',
    email: '',
    phone: '',
    businessName: '',
    dba: '',
    ein: '',
    address: '',
    ptin: '',
    efin: '',
    efileProviderName: '',
  })

  const due = useMemo(() => {
    if (!tier) return []
    if (tier === 'TC') return [{ id: 'tc-reg', label: 'TC registration', amount: 0 }]
    if (tier === 'TP')
      return [{ id: 'tp-reg', label: 'TP registration / upfront fee', amount: TP_REGISTRATION_FEE }]
    return [
      {
        id: officePlan === 899 ? 'office-sub-899' : 'office-sub-1250',
        label: officePlan === 899 ? 'Office Standard subscription' : 'Office Plus subscription',
        amount: officePlan,
      },
    ]
  }, [tier, officePlan])

  if (!tier || !card) {
    return (
      <div className="login-page">
        <div className="container">
          <p>Unknown registration tier.</p>
          <Link to="/register">Back</Link>
        </div>
      </div>
    )
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function submitForm(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.legalName.trim() || !form.email.trim()) {
      setFormError('Legal name and email are required.')
      return
    }
    if (tier === 'TP') {
      if (!isValidPtinFormat(form.ptin)) {
        setFormError('TP registration requires a valid current-year PTIN (P + 8 digits).')
        return
      }
    }
    if (tier === 'Office') {
      if (!form.businessName.trim() || !form.address.trim()) {
        setFormError('Office registration requires business name and address.')
        return
      }
      if (!isValidEinFormat(form.ein)) {
        setFormError('Office registration requires a valid EIN.')
        return
      }
      if (!isValidEfinFormat(form.efin)) {
        setFormError('Office registration requires a valid EFIN (6 digits).')
        return
      }
    }
    setStep('pay')
  }

  function payTestMode() {
    if (!tier || !card) return
    const result = actions.completeTierRegistration({
      tier,
      legalName: form.legalName,
      email: form.email,
      phone: form.phone,
      businessName: form.businessName || form.dba,
      address: form.address,
      ptin: form.ptin,
      efin: form.efin,
      ein: form.ein,
      efileProviderName: form.efileProviderName,
      lines: due,
      planAmount: tier === 'Office' ? officePlan : due[0]?.amount ?? 0,
    })
    if (!result.ok) {
      setFormError(result.error)
      setStep('form')
      return
    }
    const parts: string[] = []
    if (result.credentialViews.ptin) parts.push(result.credentialViews.ptin.displayHint)
    if (result.credentialViews.efin) parts.push(result.credentialViews.efin.displayHint)
    setCredNote(
      parts.length
        ? `${parts.join(' · ')}. Stored as irreversible fingerprint + last-four only (not recoverable encryption) — not verified until an authorized validation process completes.`
        : 'No professional credentials required for TC.',
    )
    setStep('done')
  }

  function enterApp() {
    if (!card) return
    navigate(card.role === 'taxpayer' ? '/app/taxpayer' : card.role === 'preparer' ? '/app/preparer' : '/app/office')
  }

  return (
    <ProductionRegisterGate>
    <div className="login-page register-page">
      <div className="container login-wrap">
        <div className="login-brand rise">
          <BrandMark size={48} />
          <div>
            <p className="eyebrow">{card.subtitle}</p>
            <h1 className="brand" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)' }}>
              {card.title}
            </h1>
            <p>
              {tier === 'TC' && 'No PTIN or EFIN required. Prepare and manage your own tax return.'}
              {tier === 'TP' && (
                <>
                  <strong>{UNLIMITED_CLIENTS_COPY}. </strong>
                  PTIN required. No EFIN. Cannot add other preparers — clients only.
                </>
              )}
              {tier === 'Office' && (
                <>
                  <strong>{UNLIMITED_CLIENTS_COPY}. </strong>
                  EFIN required. Invite preparers (each with their own PTIN where applicable).
                </>
              )}
            </p>
          </div>
        </div>

        {step === 'form' && (
          <form className="panel register-form rise" onSubmit={submitForm}>
            <h2>Registration details</h2>
            {formError && (
              <p className="callout warn" role="alert">
                {formError}
              </p>
            )}
            <div className="field">
              <label htmlFor="legalName">{tier === 'Office' ? 'Authorized owner legal name' : 'Legal name'}</label>
              <input
                id="legalName"
                required
                value={form.legalName}
                onChange={(e) => update('legalName', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="email">Contact email</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>

            {tier === 'TP' && (
              <>
                <div className="field">
                  <label htmlFor="businessName">Business name (if applicable)</label>
                  <input
                    id="businessName"
                    value={form.businessName}
                    onChange={(e) => update('businessName', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ptin">Current-year PTIN (required)</label>
                  <input
                    id="ptin"
                    required
                    placeholder="P12345678"
                    value={form.ptin}
                    onChange={(e) => update('ptin', e.target.value.toUpperCase())}
                  />
                </div>
                <div className="field">
                  <label htmlFor="efileProviderName">Authorized e-file provider (required before e-file)</label>
                  <input
                    id="efileProviderName"
                    value={form.efileProviderName}
                    onChange={(e) => update('efileProviderName', e.target.value)}
                    placeholder="Provider name — association stays pending until verified"
                  />
                </div>
                <p className="muted">
                  No EFIN required for TP. TP = clients only — you cannot invite or manage other preparers. Entered PTIN
                  is fingerprinted (not stored in recoverable form) and stays <strong>pending verification</strong> until
                  an authorized validation completes.
                </p>
              </>
            )}

            {tier === 'Office' && (
              <>
                <div className="field">
                  <label htmlFor="businessName">Legal business name</label>
                  <input
                    id="businessName"
                    required
                    value={form.businessName}
                    onChange={(e) => update('businessName', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="dba">DBA (if applicable)</label>
                  <input id="dba" value={form.dba} onChange={(e) => update('dba', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="ein">EIN (required)</label>
                  <input
                    id="ein"
                    required
                    placeholder="12-3456789"
                    value={form.ein}
                    onChange={(e) => update('ein', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="address">Business address</label>
                  <input
                    id="address"
                    required
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="efin">EFIN (required)</label>
                  <input
                    id="efin"
                    required
                    placeholder="123456"
                    value={form.efin}
                    onChange={(e) => update('efin', e.target.value)}
                  />
                </div>
                <fieldset className="plan-pick">
                  <legend>Subscription selection</legend>
                  <label className="plan-option">
                    <input
                      type="radio"
                      name="plan"
                      checked={officePlan === 899}
                      onChange={() => setOfficePlan(899)}
                    />
                    <span>
                      Standard — {formatMoney(OFFICE_SUBSCRIPTION_FLOOR)} ({PRICING.Office.subscriptionBillingFrequency}
                      )
                    </span>
                  </label>
                  <label className="plan-option">
                    <input
                      type="radio"
                      name="plan"
                      checked={officePlan === 1250}
                      onChange={() => setOfficePlan(1250)}
                    />
                    <span>
                      Plus — {formatMoney(OFFICE_SUBSCRIPTION_HIGH)} ({PRICING.Office.subscriptionBillingFrequency})
                    </span>
                  </label>
                </fieldset>
                <p className="muted">
                  Office = preparers + clients. EFIN/EIN are fingerprinted (not recoverable encryption) and stay pending
                  verification. Paid preparers you invite must supply their own PTIN where applicable.
                </p>
              </>
            )}

            {tier === 'TC' && (
              <p className="muted">No PTIN or EFIN. You can prepare and upload documents for your own return only.</p>
            )}

            <div className="callout">
              <strong>Identity & payment:</strong> Collected for demo enrollment. Production uses verified identity
              checks and a payment provider in test mode before go-live.
            </div>
            <div className="callout warn">
              <strong>Banking products:</strong> {BANKING_FEES_NOTE}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link className="btn btn-secondary" to="/register">
                Back
              </Link>
              <button className="btn btn-primary" type="submit">
                Continue to checkout
              </button>
            </div>
          </form>
        )}

        {step === 'pay' && (
          <section className="panel register-form rise">
            <h2>Checkout (payment test mode)</h2>
            <p className="muted">No live charges. Credential verification is a separate process after payment.</p>
            {due.map((line) => (
              <div className="row-item" key={line.id}>
                <div>
                  <strong>{line.label}</strong>
                  <span className="row-meta">NOVARA software / subscription — not a bank-product fee</span>
                </div>
                <strong>{formatMoney(line.amount)}</strong>
              </div>
            ))}
            {tier !== 'TC' && (
              <p className="badge badge-ok" style={{ justifySelf: 'start' }}>
                {UNLIMITED_CLIENTS_COPY}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button className="btn btn-secondary" type="button" onClick={() => setStep('form')}>
                Back
              </button>
              <button className="btn btn-primary" type="button" onClick={payTestMode}>
                Pay {formatMoney(due.reduce((s, d) => s + d.amount, 0))} (test)
              </button>
            </div>
          </section>
        )}

        {step === 'done' && (
          <section className="panel register-form rise">
            <h2>Registration complete</h2>
            <p>
              Your {card.subtitle} account is ready in this demo session
              {tier !== 'TC' ? ` with ${UNLIMITED_CLIENTS_COPY.toLowerCase()}` : ''}.
            </p>
            {credNote && <p className="muted">{credNote}</p>}
            {tier === 'TP' && (
              <p className="muted">Electronic filing stays blocked until PTIN verification and e-file provider association complete.</p>
            )}
            {tier === 'Office' && (
              <p className="muted">Electronic filing stays blocked until EFIN verification completes. Add preparers from Staff.</p>
            )}
            <button className="btn btn-primary" type="button" onClick={enterApp}>
              Enter dashboard
            </button>
          </section>
        )}
      </div>
    </div>
    </ProductionRegisterGate>
  )
}
