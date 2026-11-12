import { useMemo, useState, type FormEvent } from 'react'
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
import { actions } from '../store/useAppStore'
import './Login.css'
import './Register.css'

type Step = 'choose' | 'form' | 'pay' | 'done'

export function RegisterHub() {
  return (
    <div className="login-page register-page">
      <div className="container login-wrap">
        <div className="login-brand rise">
          <BrandMark size={52} />
          <div>
            <h1 className="brand">NOVARA</h1>
            <p>Choose your account tier. Pricing is the same everywhere in NOVARA — one centralized catalog.</p>
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
  const [paidIds, setPaidIds] = useState<string[]>([])
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
    sponsoringOffice: '',
    ownerName: '',
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
    if (!form.legalName.trim() || !form.email.trim()) return
    setStep('pay')
  }

  function payTestMode() {
    // Demo checkout — payment-provider test mode; no live charges
    const ids = due.map((d) => d.id)
    if (ids.some((id) => paidIds.includes(id))) return
    setPaidIds((p) => [...p, ...ids])
    if (!tier || !card) return
    actions.recordRegistrationPayment({
      tier,
      lines: due,
      planAmount: tier === 'Office' ? officePlan : due[0]?.amount ?? 0,
    })
    actions.loginAs(card.role)
    setStep('done')
  }

  function enterApp() {
    if (!card) return
    navigate(card.role === 'taxpayer' ? '/app/taxpayer' : card.role === 'preparer' ? '/app/preparer' : '/app/office')
  }

  return (
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
              {tier !== 'TC' && <strong>{UNLIMITED_CLIENTS_COPY}. </strong>}
              Banking-product fees stay separate. Demo uses payment test mode — no live bank or IRS connections yet.
            </p>
          </div>
        </div>

        {step === 'form' && (
          <form className="panel register-form rise" onSubmit={submitForm}>
            <h2>Registration details</h2>
            <div className="field">
              <label htmlFor="legalName">{tier === 'Office' ? 'Owner legal name' : 'Legal name'}</label>
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
                  <label htmlFor="ptin">PTIN (where required)</label>
                  <input id="ptin" value={form.ptin} onChange={(e) => update('ptin', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="sponsoringOffice">Sponsoring tax office / authorized EFIN association</label>
                  <input
                    id="sponsoringOffice"
                    required
                    value={form.sponsoringOffice}
                    onChange={(e) => update('sponsoringOffice', e.target.value)}
                    placeholder="Office name or EFIN reference"
                  />
                </div>
                <p className="muted">Unauthorized use of another office’s EFIN is not permitted.</p>
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
                  <label htmlFor="ein">EIN</label>
                  <input id="ein" required value={form.ein} onChange={(e) => update('ein', e.target.value)} />
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
                  <label htmlFor="efin">EFIN (verification required before live filing)</label>
                  <input id="efin" value={form.efin} onChange={(e) => update('efin', e.target.value)} />
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
              </>
            )}

            <div className="callout">
              <strong>Identity & payment:</strong> Collected for demo enrollment. Production will use verified identity
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
            <p className="muted">No live charges. Duplicate fee lines are blocked.</p>
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
            <button className="btn btn-primary" type="button" onClick={enterApp}>
              Enter dashboard
            </button>
          </section>
        )}
      </div>
    </div>
  )
}
