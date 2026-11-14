import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BANKING_FEES_NOTE,
  OFFICE_FEES,
  OFFICE_SUBSCRIPTION_BUSINESS,
  OFFICE_SUBSCRIPTION_PERSONAL,
  OFFICE_SUBSCRIPTION_SELF_EMPLOYED,
  OFFICE_TIERS,
  PRIOR_YEAR_SURCHARGE,
  PRICING,
  STARTER_INCLUDES,
  TC_BUSINESS_FEE,
  TC_FEES,
  TC_PERSONAL_FEE,
  TP_BUSINESS_FEE,
  TP_FEES,
  TP_PERSONAL_FEE,
  TP_SELF_EMPLOYED_FEE,
  UNLIMITED_CLIENTS_COPY,
  estimateNovaraAnnualCharges,
  formatMoney,
} from '../data/fees'
import './shared.css'
import './Fees.css'

const FAQ = [
  {
    q: 'Is the office subscription monthly or annual?',
    a: `Office plans are billed ${PRICING.Office.subscriptionBillingFrequency}: Personal ${formatMoney(OFFICE_SUBSCRIPTION_PERSONAL)}, Self-Employed ${formatMoney(OFFICE_SUBSCRIPTION_SELF_EMPLOYED)}, Business ${formatMoney(OFFICE_SUBSCRIPTION_BUSINESS)}.`,
  },
  {
    q: 'Do TP or Office accounts limit clients or returns?',
    a: `No. ${UNLIMITED_CLIENTS_COPY}. Independent TPs pay per completed return. Office subscriptions include covered return types with no additional NOVARA per-return fee.`,
  },
  {
    q: 'Can an office have multiple preparers?',
    a: 'Yes. Office owners invite preparers with individual logins and PTINs where applicable. Independent TP accounts cannot add preparers — TP = clients only. Unauthorized EFIN use is blocked. Office-employed preparers are not charged standalone TP fees.',
  },
  {
    q: 'What credentials are required to register?',
    a: 'TC: none. TP: current-year PTIN (no EFIN). Office: EFIN plus business EIN/address/owner. Manually entered PTIN/EFIN values stay pending until an authorized verification process completes — they are never auto-verified.',
  },
  {
    q: 'How does prior-year pricing work?',
    a: `During the active filing season, the current tax year is regular price. Each prior tax year adds a ${formatMoney(PRIOR_YEAR_SURCHARGE)} NOVARA surcharge once per year (not once per personal and business). Enrollment/subscription stays separate. IRS penalties are never mixed into NOVARA fees.`,
  },
  {
    q: 'Are bank-product fees included?',
    a: 'No. They are separate and disclosed before authorization.',
  },
  {
    q: 'Does a TP also pay the TC retail price?',
    a: 'No. TC retail fees and TP per-return software fees are separate billing relationships. Do not stack them on the same charge line.',
  },
]

export function Fees() {
  const [individualReturns, setIndividualReturns] = useState(300)
  const [selfEmployedReturns, setSelfEmployedReturns] = useState(0)
  const [businessReturns, setBusinessReturns] = useState(0)
  const [schedule, setSchedule] = useState<'Office' | 'TP'>('Office')
  const [subAmount, setSubAmount] = useState<number>(OFFICE_SUBSCRIPTION_PERSONAL)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const estimate = useMemo(
    () =>
      estimateNovaraAnnualCharges({
        subscriptionAnnual: schedule === 'Office' ? subAmount : 0,
        individualReturns: Math.max(0, individualReturns),
        selfEmployedReturns: Math.max(0, selfEmployedReturns),
        businessReturns: Math.max(0, businessReturns),
        schedule,
      }),
    [individualReturns, selfEmployedReturns, businessReturns, schedule, subAmount],
  )

  return (
    <div className="page container pricing-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Three-tier pricing</p>
          <h1>NOVARA Pricing — TC · TP · Office</h1>
        </div>
        <Link className="btn btn-primary" to="/register">
          Register
        </Link>
      </header>

      <p className="pricing-intro muted rise">
        All screens read from one pricing catalog. Banking-product fees are separate. Existing customer billing
        agreements are preserved — catalog updates do not auto-migrate or re-charge subscribers.
      </p>

      <section className="panel how-steps rise">
        <h2>Official fee table</h2>
        <div className="fee-table" role="table">
          <div className="fee-table-row head" role="row">
            <span>Fee</span>
            <span>TC</span>
            <span>TP (per return)</span>
            <span>Office (per year)</span>
          </div>
          <div className="fee-table-row" role="row">
            <span>Registration / subscription</span>
            <span>{formatMoney(0)}</span>
            <span>None — pay per return</span>
            <span>
              {formatMoney(OFFICE_SUBSCRIPTION_PERSONAL)} / {formatMoney(OFFICE_SUBSCRIPTION_SELF_EMPLOYED)} /{' '}
              {formatMoney(OFFICE_SUBSCRIPTION_BUSINESS)}
            </span>
          </div>
          <div className="fee-table-row" role="row">
            <span>Personal tax return</span>
            <span>{formatMoney(TC_PERSONAL_FEE)}</span>
            <span>{formatMoney(TP_PERSONAL_FEE)}</span>
            <span>Included ($0)</span>
          </div>
          <div className="fee-table-row" role="row">
            <span>Self-employed / Schedule C</span>
            <span>—</span>
            <span>{formatMoney(TP_SELF_EMPLOYED_FEE)}</span>
            <span>Included on SE+ plans ($0)</span>
          </div>
          <div className="fee-table-row" role="row">
            <span>Business entity (1065 / 1120-S / 1120)</span>
            <span>{formatMoney(TC_BUSINESS_FEE)}</span>
            <span>{formatMoney(TP_BUSINESS_FEE)}</span>
            <span>Included on Business plan ($0)</span>
          </div>
        </div>
      </section>

      <section className="list-panel panel rise" style={{ marginTop: '1rem' }}>
        <div className="section-head">
          <h2>1. TC — Tax Client</h2>
          <span className="badge badge-ok">Approved</span>
        </div>
        <p className="muted">Direct registration. NOVARA calculates and applies allowable benefits automatically.</p>
        {TC_FEES.map((f) => (
          <div className="row-item" key={f.id}>
            <div>
              <strong>{f.label}</strong>
              <span className="row-meta">{f.note}</span>
            </div>
            <strong>{formatMoney(f.amount)}</strong>
          </div>
        ))}
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <div className="section-head">
          <h2>2. TP — Tax Preparer (pay per return)</h2>
          <span className="badge badge-ok">{UNLIMITED_CLIENTS_COPY}</span>
        </div>
        <p className="muted">{PRICING.TP.disclosure}</p>
        {TP_FEES.map((f) => (
          <div className="row-item" key={f.id}>
            <div>
              <strong>{f.label}</strong>
              <span className="row-meta">{f.note}</span>
            </div>
            <strong>{formatMoney(f.amount)}</strong>
          </div>
        ))}
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <div className="section-head">
          <h2>3. Office — Tax Office (per year)</h2>
          <span className="badge badge-ok">{UNLIMITED_CLIENTS_COPY}</span>
        </div>
        <p className="muted">{PRICING.Office.disclosure}</p>
        <ul className="check-list">
          {STARTER_INCLUDES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="tier-list">
          {OFFICE_TIERS.map((t) => (
            <div className="row-item" key={t.id}>
              <div>
                <strong>{t.name}</strong>
                <span className="row-meta">{t.blurb}</span>
              </div>
              <strong>{formatMoney(t.annual!)}/year</strong>
            </div>
          ))}
        </div>
        {OFFICE_FEES.filter((f) => f.id === 'office-covered-return').map((f) => (
          <div className="row-item" key={f.id}>
            <div>
              <strong>{f.label}</strong>
              <span className="row-meta">{f.note}</span>
            </div>
            <strong>{formatMoney(f.amount)}</strong>
          </div>
        ))}
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <div className="section-head">
          <h2>4. Bank products</h2>
          <span className="badge badge-warn">Not live</span>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          {BANKING_FEES_NOTE}
        </p>
        <p className="muted">
          Architecture supports <strong>office-selected</strong> providers and/or a <strong>NOVARA platform</strong>{' '}
          partner (mode: {PRICING.banking.providerSelectionMode}). Eligibility APIs stay offline until a provider is
          verified — NOVARA does not simulate approvals.
        </p>
      </section>

      <section className="list-panel panel calculator" style={{ marginTop: '1rem' }}>
        <h2>Fee calculator</h2>
        <div className="calc-grid">
          <div className="field">
            <label htmlFor="sched">Fee schedule</label>
            <select id="sched" value={schedule} onChange={(e) => setSchedule(e.target.value as 'Office' | 'TP')}>
              <option value="Office">Office annual subscription</option>
              <option value="TP">TP pay-per-return</option>
            </select>
          </div>
          {schedule === 'Office' && (
            <div className="field">
              <label htmlFor="sub">Subscription (per year)</label>
              <select id="sub" value={subAmount} onChange={(e) => setSubAmount(Number(e.target.value))}>
                <option value={OFFICE_SUBSCRIPTION_PERSONAL}>
                  {formatMoney(OFFICE_SUBSCRIPTION_PERSONAL)} Personal / year
                </option>
                <option value={OFFICE_SUBSCRIPTION_SELF_EMPLOYED}>
                  {formatMoney(OFFICE_SUBSCRIPTION_SELF_EMPLOYED)} Self-Employed / year
                </option>
                <option value={OFFICE_SUBSCRIPTION_BUSINESS}>
                  {formatMoney(OFFICE_SUBSCRIPTION_BUSINESS)} Business / year
                </option>
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="ind">Personal returns</label>
            <input
              id="ind"
              type="number"
              min={0}
              value={individualReturns}
              onChange={(e) => setIndividualReturns(Number(e.target.value) || 0)}
            />
          </div>
          <div className="field">
            <label htmlFor="se">Self-employed / Sch. C returns</label>
            <input
              id="se"
              type="number"
              min={0}
              value={selfEmployedReturns}
              onChange={(e) => setSelfEmployedReturns(Number(e.target.value) || 0)}
            />
          </div>
          <div className="field">
            <label htmlFor="biz">Business entity returns</label>
            <input
              id="biz"
              type="number"
              min={0}
              value={businessReturns}
              onChange={(e) => setBusinessReturns(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="example-math" style={{ marginTop: '0.75rem' }}>
          <div className="row-item">
            <div>
              <strong>{schedule === 'Office' ? 'Subscription (per year)' : 'TP annual subscription'}</strong>
            </div>
            <strong>{formatMoney(schedule === 'Office' ? subAmount : 0)}</strong>
          </div>
          <div className="row-item">
            <div>
              <strong>Personal return fees</strong>
              <span className="row-meta">
                {individualReturns} × {formatMoney(estimate.personalRate)}
                {schedule === 'TP' ? ' (per return)' : ' (included)'}
              </span>
            </div>
            <strong>{formatMoney(estimate.individualFees)}</strong>
          </div>
          <div className="row-item">
            <div>
              <strong>Self-employed return fees</strong>
              <span className="row-meta">
                {selfEmployedReturns} × {formatMoney(estimate.selfEmployedRate)}
                {schedule === 'TP' ? ' (per return)' : ' (included)'}
              </span>
            </div>
            <strong>{formatMoney(estimate.selfEmployedFees)}</strong>
          </div>
          <div className="row-item">
            <div>
              <strong>Business entity return fees</strong>
              <span className="row-meta">
                {businessReturns} × {formatMoney(estimate.businessRate)}
                {schedule === 'TP' ? ' (per return)' : ' (included)'}
              </span>
            </div>
            <strong>{formatMoney(estimate.businessFees)}</strong>
          </div>
          <div className="row-item total-row">
            <div>
              <strong>Estimated NOVARA platform charges</strong>
              <span className="row-meta">Excludes customer prep markups and bank products</span>
            </div>
            <strong>{formatMoney(estimate.total)}</strong>
          </div>
        </div>
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>FAQ</h2>
        {FAQ.map((item, i) => (
          <button
            key={item.q}
            type="button"
            className="faq-row"
            onClick={() => setOpenFaq(openFaq === i ? null : i)}
          >
            <strong>{item.q}</strong>
            {openFaq === i && <span className="muted">{item.a}</span>}
          </button>
        ))}
      </section>
    </div>
  )
}
