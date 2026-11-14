import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  OFFICE_PERSONAL_FEE,
  OFFICE_SUBSCRIPTION_FLOOR,
  OFFICE_SUBSCRIPTION_HIGH,
  formatMoney,
} from '../../data/fees'
import { listBankProviderConfigs } from '../../engine/bankProducts'
import {
  emptyOfficeOnboardingDraft,
  evaluateOfficeOnboarding,
  type OfficeOnboardingDraft,
  type OnboardingStepId,
} from '../../engine/officeOnboarding'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import '../../components/filing/FilingPanels.css'

const STEPS: { id: OnboardingStepId; title: string }[] = [
  { id: 'registration', title: '1. Office registration' },
  { id: 'efin', title: '2. EFIN verification' },
  { id: 'preparers', title: '3. Preparer management' },
  { id: 'pricing', title: '4. Office pricing' },
  { id: 'banking', title: '5. Banking products' },
  { id: 'readiness', title: '6. Office readiness' },
]

export function OfficeOnboarding() {
  const { currentUser, officeStaff, officeOnboarding } = useAppStore()
  const [step, setStep] = useState<OnboardingStepId>('registration')
  const [draft, setDraft] = useState<OfficeOnboardingDraft>(
    () => officeOnboarding ?? emptyOfficeOnboardingDraft(),
  )
  const [msg, setMsg] = useState<string | null>(null)

  const staff = useMemo(
    () => officeStaff.filter((s) => s.tenantId === currentUser?.tenantId),
    [officeStaff, currentUser],
  )
  const report = useMemo(
    () => evaluateOfficeOnboarding({ draft, owner: currentUser, staff }),
    [draft, currentUser, staff],
  )
  const providers = useMemo(() => listBankProviderConfigs(currentUser?.tenantId), [currentUser])

  function patch(p: Partial<OfficeOnboardingDraft>) {
    setDraft((d) => ({ ...d, ...p, updatedAt: new Date().toISOString() }))
  }

  function save() {
    actions.saveOfficeOnboarding(draft)
    setMsg('Office onboarding progress saved (additive — pricing and permissions unchanged).')
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tax office setup</p>
          <h1>Office onboarding wizard</h1>
        </div>
        <Link className="btn btn-secondary" to="/app/office">
          Back to office home
        </Link>
      </header>

      <p className="muted" style={{ maxWidth: '44rem' }}>
        Guided setup for new offices. Does not replace Staff, Pipeline, or Fees. Live e-file and banking stay inactive
        until credentials and partners verify.
      </p>

      <div className="tracking-grid">
        {STEPS.map((s) => {
          const st = report.steps.find((x) => x.id === s.id)
          return (
            <button
              key={s.id}
              type="button"
              className={`tracking-card ${step === s.id ? 'selected' : ''}`}
              onClick={() => setStep(s.id)}
              style={{ textAlign: 'left', cursor: 'pointer', border: step === s.id ? '1px solid #0e7490' : undefined }}
            >
              <p className="label">{st?.complete ? 'Complete' : 'Open'}</p>
              <strong>{s.title}</strong>
            </button>
          )
        })}
      </div>

      <section className="filing-panel">
        {step === 'registration' && (
          <>
            <h2>Office registration</h2>
            <div className="delivery-fields">
              <label>
                Business name
                <input value={draft.businessName} onChange={(e) => patch({ businessName: e.target.value })} />
              </label>
              <label>
                Authorized representative
                <input value={draft.authorizedRep} onChange={(e) => patch({ authorizedRep: e.target.value })} />
              </label>
              <label>
                Contact email
                <input value={draft.contactEmail} onChange={(e) => patch({ contactEmail: e.target.value })} />
              </label>
              <label>
                Phone
                <input value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} />
              </label>
              <label>
                Address
                <input value={draft.addressLine1} onChange={(e) => patch({ addressLine1: e.target.value })} />
              </label>
              <label>
                City
                <input value={draft.city} onChange={(e) => patch({ city: e.target.value })} />
              </label>
              <label>
                State
                <input value={draft.state} onChange={(e) => patch({ state: e.target.value })} maxLength={2} />
              </label>
              <label>
                ZIP
                <input value={draft.zip} onChange={(e) => patch({ zip: e.target.value })} />
              </label>
            </div>
          </>
        )}

        {step === 'efin' && (
          <>
            <h2>EFIN verification</h2>
            <p className="muted">
              Current credential status:{' '}
              {currentUser?.credentials?.efin
                ? `${currentUser.credentials.efin.status} (fingerprint only)`
                : 'none on file'}
            </p>
            <div className="delivery-fields">
              <label>
                EFIN (6 digits)
                <input
                  value={draft.efinInput}
                  onChange={(e) => patch({ efinInput: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  inputMode="numeric"
                />
              </label>
            </div>
            <p className="muted">
              Submit via existing credential workflow on Staff / account settings when available. NOVARA does not claim
              IRS EFIN lookup is live.
            </p>
            <Link className="btn btn-secondary" to="/app/office/staff">
              Open Staff
            </Link>
          </>
        )}

        {step === 'preparers' && (
          <>
            <h2>Preparer management</h2>
            <p className="muted">
              Add preparers and PTINs on the existing Staff page — this wizard only tracks readiness.
            </p>
            <ul>
              {staff.length === 0 ? <li className="muted">No staff roster entries yet.</li> : null}
              {staff.map((s) => (
                <li key={s.id}>
                  {s.name} · {s.kind} · {s.status}
                  {s.ptinDisplay ? ` · PTIN ${s.ptinDisplay}` : ''}
                </li>
              ))}
            </ul>
            <Link className="btn btn-primary" to="/app/office/staff">
              Manage preparers
            </Link>
          </>
        )}

        {step === 'pricing' && (
          <>
            <h2>Office pricing</h2>
            <p className="muted">
              NOVARA Office annual plans: {formatMoney(OFFICE_SUBSCRIPTION_FLOOR)}–
              {formatMoney(OFFICE_SUBSCRIPTION_HIGH)} per year. Covered returns under the subscribed plan
              have {formatMoney(OFFICE_PERSONAL_FEE)} additional NOVARA per-return fee (including returns
              completed by office-employed preparers). Set your own client preparation charges below —
              those are office fees, not NOVARA prices. Bank-product fees stay separate.
            </p>
            <div className="delivery-fields">
              <label>
                Office preparation fee — personal (optional, office charge)
                <input
                  type="number"
                  min={0}
                  value={draft.officeServicePersonalFee ?? ''}
                  onChange={(e) =>
                    patch({ officeServicePersonalFee: e.target.value === '' ? null : Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Office preparation fee — business (optional, office charge)
                <input
                  type="number"
                  min={0}
                  value={draft.officeServiceBusinessFee ?? ''}
                  onChange={(e) =>
                    patch({ officeServiceBusinessFee: e.target.value === '' ? null : Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <Link className="btn btn-secondary" to="/app/fees">
              View official NOVARA fee catalog
            </Link>
          </>
        )}

        {step === 'banking' && (
          <>
            <h2>Banking products</h2>
            <p className="muted">Select a configuration for enrollment prep. Products remain offline until verified.</p>
            <div className="delivery-fields">
              <label>
                Banking partner configuration
                <select
                  value={draft.selectedBankProviderId ?? ''}
                  onChange={(e) => patch({ selectedBankProviderId: e.target.value || null })}
                >
                  <option value="">Select…</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} ({p.selectionMode.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        {step === 'readiness' && (
          <>
            <h2>Office readiness</h2>
            <p>
              <span className={`badge ${report.activationStatus === 'blocked' ? 'badge-warn' : 'badge-ok'}`}>
                {report.activationStatus.replace(/_/g, ' ')}
              </span>{' '}
              {report.summary} ({report.percentComplete}%)
            </p>
            <ul className="readiness-list">
              {report.steps.map((s) => (
                <li key={s.id} className={`readiness-item status-${s.complete ? 'complete' : 'pending'}`}>
                  <strong>{s.title}</strong>
                  <span>
                    {s.notes.join(' ')}
                    {s.blockers.length ? ` Blockers: ${s.blockers.join('; ')}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button className="btn btn-primary" type="button" onClick={save}>
            Save progress
          </button>
          {step !== 'readiness' && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                const idx = STEPS.findIndex((s) => s.id === step)
                setStep(STEPS[Math.min(STEPS.length - 1, idx + 1)].id)
              }}
            >
              Next step
            </button>
          )}
        </div>
        {msg && (
          <p className="muted" role="status">
            {msg}
          </p>
        )}
      </section>
    </div>
  )
}
