import { Link } from 'react-router-dom'
import { formatMoney } from '../../data/fees'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import './ReturnEditor.css'

export function ReturnEditor() {
  const { taxProfile, benefitReport, returns, activeReturnId } = useAppStore()
  const active = returns.find((r) => r.id === activeReturnId) ?? returns[0]

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tax return workspace</p>
          <h1>{active?.clientName ?? 'Return'} · TY{taxProfile.taxYear}</h1>
        </div>
        <div className="benefit-actions">
          <Link className="btn btn-secondary" to="/app/preparer/benefits">
            Benefit discovery
          </Link>
          <button className="btn btn-primary" type="button" onClick={() => actions.runBenefitScan()}>
            Recalculate benefits
          </button>
        </div>
      </header>

      <p className="muted" style={{ marginTop: '-0.5rem' }}>
        This is the actual return editor (not just status tracking). Enter income, dependents, childcare, education, and
        deductions — the optimization engine updates the refund projection live.
      </p>

      <RefundTracker report={benefitReport} />

      <div className="return-grid" style={{ marginTop: '1rem' }}>
        <section className="list-panel panel">
          <h2>Income</h2>
          <div className="field">
            <label htmlFor="wages">Wages (W-2)</label>
            <input
              id="wages"
              type="number"
              value={taxProfile.wages}
              onChange={(e) => actions.updateTaxProfile({ wages: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="field">
            <label htmlFor="wh">Federal withholding</label>
            <input
              id="wh"
              type="number"
              value={taxProfile.withholding}
              onChange={(e) => actions.updateTaxProfile({ withholding: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="field">
            <label htmlFor="se">Self-employment / Schedule C income</label>
            <input
              id="se"
              type="number"
              value={taxProfile.selfEmploymentIncome}
              onChange={(e) => actions.updateTaxProfile({ selfEmploymentIncome: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="field">
            <label htmlFor="fs">Filing status</label>
            <select
              id="fs"
              value={taxProfile.filingStatus}
              onChange={(e) =>
                actions.updateTaxProfile({
                  filingStatus: e.target.value as typeof taxProfile.filingStatus,
                })
              }
            >
              <option value="unknown">Not set</option>
              <option value="single">Single</option>
              <option value="mfj">Married filing jointly</option>
              <option value="hoh">Head of household</option>
              <option value="mfs">Married filing separately</option>
            </select>
          </div>
        </section>

        <section className="list-panel panel">
          <h2>Dependents & childcare</h2>
          <div className="field">
            <label htmlFor="deps">Number of children under 17</label>
            <input
              id="deps"
              type="number"
              min={0}
              value={taxProfile.dependents.filter((d) => d.age < 17).length}
              onChange={(e) => {
                const n = Math.max(0, Number(e.target.value) || 0)
                // Count only — do not invent eligibility; finish facts on Dependents page
                if (n === 0) {
                  actions.answerDependentQuestion('potential_dependents', 'no', 'Do you have any children or other people who may qualify as your dependents?')
                } else {
                  actions.answerDependentQuestion('potential_dependents', 'yes', 'Do you have any children or other people who may qualify as your dependents?')
                  actions.answerDependentQuestion('dependent_count', n, 'How many children or other potential dependents do you have?')
                }
              }}
            />
            <p className="muted" style={{ marginTop: '0.35rem' }}>
              Open the Dependents interview to collect legal name, DOB, TIN last-4, residency, and eligibility tests for each
              person — refund credits stay blocked until that interview is complete.
            </p>
          </div>
          <div className="field">
            <label htmlFor="care">Qualifying childcare expenses</label>
            <input
              id="care"
              type="number"
              value={taxProfile.childcarePaid}
              onChange={(e) =>
                actions.updateTaxProfile({
                  childcarePaid: Number(e.target.value) || 0,
                  answers: {
                    ...taxProfile.answers,
                    paid_childcare: Number(e.target.value) > 0 ? 'yes' : 'no',
                    childcare_amount: Number(e.target.value) || 0,
                  },
                })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="fsa">Employer dependent-care benefits</label>
            <input
              id="fsa"
              type="number"
              value={taxProfile.employerDependentCare}
              onChange={(e) => actions.updateTaxProfile({ employerDependentCare: Number(e.target.value) || 0 })}
            />
          </div>
          <p className="muted">
            When childcare is entered after dependents, CDCC is evaluated and coordinated with dependent-care benefits.
          </p>
        </section>

        <section className="list-panel panel">
          <h2>Education & retirement</h2>
          <div className="field">
            <label htmlFor="tuition">Eligible tuition / education expenses</label>
            <input
              id="tuition"
              type="number"
              value={taxProfile.tuitionPaid}
              onChange={(e) =>
                actions.updateTaxProfile({
                  tuitionPaid: Number(e.target.value) || 0,
                  answers: { ...taxProfile.answers, education_expenses: Number(e.target.value) > 0 ? 'yes' : 'no' },
                })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="loan">Student loan interest</label>
            <input
              id="loan"
              type="number"
              value={taxProfile.studentLoanInterest}
              onChange={(e) => actions.updateTaxProfile({ studentLoanInterest: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="field">
            <label htmlFor="ret">Retirement contributions</label>
            <input
              id="ret"
              type="number"
              value={taxProfile.retirementContributions}
              onChange={(e) => actions.updateTaxProfile({ retirementContributions: Number(e.target.value) || 0 })}
            />
          </div>
        </section>

        <section className="list-panel panel">
          <h2>Housing, business & other</h2>
          <div className="field">
            <label htmlFor="mort">Mortgage interest</label>
            <input
              id="mort"
              type="number"
              value={taxProfile.mortgageInterest}
              onChange={(e) => actions.updateTaxProfile({ mortgageInterest: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="field">
            <label htmlFor="pt">Property tax</label>
            <input
              id="pt"
              type="number"
              value={taxProfile.propertyTax}
              onChange={(e) => actions.updateTaxProfile({ propertyTax: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="field">
            <label htmlFor="miles">Business mileage deduction (est. $)</label>
            <input
              id="miles"
              type="number"
              value={taxProfile.businessMileage}
              onChange={(e) => actions.updateTaxProfile({ businessMileage: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="field">
            <label htmlFor="charity">Charitable contributions</label>
            <input
              id="charity"
              type="number"
              value={taxProfile.charitableGifts}
              onChange={(e) => actions.updateTaxProfile({ charitableGifts: Number(e.target.value) || 0 })}
            />
          </div>
        </section>
      </div>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>AI recommendations on this return</h2>
        {(benefitReport?.findings.filter((f) => f.status === 'needs_info' || f.status === 'eligible_unverified') ?? [])
          .slice(0, 5)
          .map((f) => (
            <div className="row-item" key={f.ruleId}>
              <div>
                <strong>{f.shortName}</strong>
                <span className="row-meta">{f.explanation}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" type="button" style={{ padding: '0.4rem 0.7rem' }} onClick={() => actions.verifyBenefit(f.ruleId)}>
                  Verify +{formatMoney(f.estimatedSavings)}
                </button>
                <button className="btn btn-ghost" type="button" style={{ padding: '0.4rem 0.7rem' }} onClick={() => actions.flagBenefitReview(f.ruleId)}>
                  Flag review
                </button>
              </div>
            </div>
          ))}
        <div className="benefit-actions" style={{ marginTop: '0.75rem' }}>
          <Link className="btn btn-primary" to="/app/preparer/benefits/review">
            Mandatory benefit final review
          </Link>
        </div>
      </section>
    </div>
  )
}
