import { useState } from 'react'
import { formatMoney, TC_PERSONAL_FEE } from '../../data/fees'
import { actions, useAppStore } from '../../store/useAppStore'
import { destinationLabel } from '../../engine/payments/phase10/refundSettlementPipeline'
import type { DebitRail } from '../../engine/payments/phase10/refundSettlementPipeline'
import './FilingPanels.css'

/**
 * Sandbox UI: IRS wire → virtual bank → verify → fee withhold → ACH/debit payout → email after confirm.
 */
export function RefundSettlementPanel({ verifiedRefund }: { verifiedRefund: number }) {
  const { refundSettlementCase, lastSettlementEmailId, currentUser } = useAppStore()
  const [payoutKind, setPayoutKind] = useState<'ach_bank' | 'debit_rail'>('ach_bank')
  const [routing, setRouting] = useState('021000021')
  const [account, setAccount] = useState('123456789')
  const [rail, setRail] = useState<DebitRail>('chime')
  const [handle, setHandle] = useState('$taxpayer')
  const [prepFee, setPrepFee] = useState(String(Math.min(TC_PERSONAL_FEE, Math.max(0, verifiedRefund * 0.2))))
  const [msg, setMsg] = useState<string | null>(null)

  const gross = verifiedRefund > 0 ? verifiedRefund : 7000

  function openCase() {
    const fee = Number(prepFee)
    const res = actions.openRefundSettlement({
      expectedRefundDollars: gross,
      authorizedPrepFeeDollars: Number.isFinite(fee) ? fee : TC_PERSONAL_FEE,
      payout:
        payoutKind === 'ach_bank'
          ? { kind: 'ach_bank', routingNumber: routing, accountNumber: account, accountType: 'checking' }
          : { kind: 'debit_rail', rail, handle },
    })
    setMsg(res.ok ? `Settlement opened (${res.caseId}).` : res.error)
  }

  function step(
    s:
      | 'receive_wire'
      | 'verify'
      | 'withhold_fees'
      | 'submit_disbursement'
      | 'confirm_disbursement'
      | 'send_email'
      | 'run_happy_path',
  ) {
    const res = actions.advanceRefundSettlement(s, gross)
    setMsg(res.ok ? `Phase: ${res.phase.replace(/_/g, ' ')}` : res.error)
  }

  const fees = refundSettlementCase?.fees

  return (
    <section className="filing-panel" data-testid="refund-settlement">
      <p className="eyebrow">Payment processing · sandbox</p>
      <h2>Refund settlement &amp; client deposit</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Government refund wires into NOVARA’s virtual settlement account. Fees are withheld automatically. The remaining
        balance goes to the client’s bank (routing/account) or debit rail (Chime / Cash App). The transactional email
        goes out <strong>only after</strong> the deposit is confirmed — not when the wire first lands.
      </p>
      <p className="muted">
        Live bank rails stay OFF. This is a sandbox walkthrough for {currentUser?.email ?? 'the taxpayer'}.
      </p>

      {!refundSettlementCase && (
        <div className="delivery-fields">
          <label>
            Authorized fee to withhold from refund
            <input
              value={prepFee}
              onChange={(e) => setPrepFee(e.target.value)}
              inputMode="decimal"
              placeholder={String(TC_PERSONAL_FEE)}
            />
          </label>
          <div className="delivery-options">
            <label className={`delivery-option ${payoutKind === 'ach_bank' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="payoutKind"
                checked={payoutKind === 'ach_bank'}
                onChange={() => setPayoutKind('ach_bank')}
              />
              <span>Bank ACH (routing + account)</span>
            </label>
            <label className={`delivery-option ${payoutKind === 'debit_rail' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="payoutKind"
                checked={payoutKind === 'debit_rail'}
                onChange={() => setPayoutKind('debit_rail')}
              />
              <span>Debit rail (Chime / Cash App)</span>
            </label>
          </div>
          {payoutKind === 'ach_bank' ? (
            <>
              <label>
                Routing number
                <input
                  value={routing}
                  onChange={(e) => setRouting(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>
              <label>
                Account number
                <input
                  value={account}
                  onChange={(e) => setAccount(e.target.value.replace(/\D/g, '').slice(0, 17))}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Debit rail
                <select value={rail} onChange={(e) => setRail(e.target.value as DebitRail)}>
                  <option value="chime">Chime</option>
                  <option value="cash_app">Cash App</option>
                  <option value="other_prepaid">Other prepaid debit</option>
                </select>
              </label>
              <label>
                Handle / last four (masked in vault)
                <input value={handle} onChange={(e) => setHandle(e.target.value)} autoComplete="off" />
              </label>
            </>
          )}
          <button className="btn btn-primary" type="button" onClick={openCase}>
            Open settlement for {formatMoney(gross)}
          </button>
        </div>
      )}

      {refundSettlementCase && (
        <div>
          <p>
            <strong>Phase:</strong> {refundSettlementCase.phase.replace(/_/g, ' ')}
          </p>
          <p className="muted">
            Virtual account ••••{refundSettlementCase.virtualAccount.accountLast4} · Payout{' '}
            {destinationLabel(refundSettlementCase.destination)}
          </p>
          {fees && (
            <ul className="tracking-events">
              <li>
                <strong>Gross refund</strong>
                <div className="muted">{formatMoney(fees.grossRefundCents / 100)}</div>
              </li>
              <li>
                <strong>Fee withheld</strong>
                <div className="muted">
                  {formatMoney((fees.prepFeeWithheldCents + fees.bankRailFeeCents) / 100)}
                </div>
              </li>
              <li>
                <strong>Net to client</strong>
                <div className="muted">{formatMoney(fees.netToClientCents / 100)}</div>
              </li>
            </ul>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.75rem' }}>
            <button className="btn btn-secondary" type="button" onClick={() => step('receive_wire')}>
              1. IRS wire hits virtual bank
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => step('verify')}>
              2. Verify amount
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => step('withhold_fees')}>
              3. Auto-withhold fee
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => step('submit_disbursement')}>
              4. Send remaining to client
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => step('confirm_disbursement')}>
              5. Confirm deposit
            </button>
            <button className="btn btn-primary" type="button" onClick={() => step('send_email')}>
              6. Transactional email
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => step('run_happy_path')}>
              Run full sandbox path
            </button>
          </div>
          <ul className="tracking-events" style={{ marginTop: '1rem' }}>
            {refundSettlementCase.timeline.map((t, i) => (
              <li key={`${t.at}-${i}`}>
                <span className="src">{t.phase.replace(/_/g, ' ')}</span>
                <div className="muted">{t.note}</div>
              </li>
            ))}
          </ul>
          {lastSettlementEmailId && (
            <p className="muted" role="status">
              Deposit notice queued ({lastSettlementEmailId}). Email fires only after fee split + confirmed client
              deposit.
            </p>
          )}
        </div>
      )}

      {msg && (
        <p className="muted" role="status">
          {msg}
        </p>
      )}
    </section>
  )
}
