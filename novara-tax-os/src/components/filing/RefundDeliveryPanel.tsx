import { useMemo, useState } from 'react'
import { formatMoney } from '../../data/fees'
import {
  REFUND_DELIVERY_LABELS,
  accountLast4,
  isValidRoutingNumber,
  maskAccountNumber,
  sanitizeRefundDeliveryForStorage,
  validateRefundDelivery,
  type BankAccountType,
  type RefundDeliveryMethod,
  type RefundDeliverySelection,
} from '../../engine/refundDelivery'
import { evaluateBankProductEligibility, listBankProviderConfigs } from '../../engine/bankProducts'
import { actions } from '../../store/useAppStore'
import './FilingPanels.css'

export function RefundDeliveryPanel({
  verifiedRefund,
  existing,
  officeTenantId,
}: {
  verifiedRefund: number
  existing: RefundDeliverySelection | null
  officeTenantId?: string | null
}) {
  const providers = useMemo(() => listBankProviderConfigs(officeTenantId), [officeTenantId])
  const [method, setMethod] = useState<RefundDeliveryMethod | ''>(existing?.method ?? '')
  const [routing, setRouting] = useState(existing?.deposit?.routingNumber ?? '')
  const [account, setAccount] = useState('')
  const [accountType, setAccountType] = useState<BankAccountType>(existing?.deposit?.accountType ?? 'checking')
  const [authorized, setAuthorized] = useState(Boolean(existing?.taxpayerAuthorized))
  const [providerId, setProviderId] = useState(existing?.bankProductProviderId ?? providers[0]?.id ?? '')
  const [productCode, setProductCode] = useState(existing?.bankProductCode ?? 'rt_standard')
  const [msg, setMsg] = useState<string | null>(null)
  const [split8888, setSplit8888] = useState(Boolean(existing?.form8888?.length))

  const provider = providers.find((p) => p.id === providerId) ?? providers[0]
  const eligibility =
    method === 'bank_product' && provider
      ? evaluateBankProductEligibility(provider, productCode)
      : null

  function save() {
    if (!method) {
      setMsg('Select a refund delivery method.')
      return
    }
    const draft: RefundDeliverySelection = {
      method,
      verifiedRefundAmount: verifiedRefund,
      selectedAt: new Date().toISOString(),
      taxpayerAuthorized: authorized,
      bankProductProviderId: method === 'bank_product' ? providerId : undefined,
      bankProductCode: method === 'bank_product' ? productCode : undefined,
      deposit:
        method === 'direct_deposit' && !split8888
          ? {
              routingNumber: routing,
              accountLast4: accountLast4(account) || existing?.deposit?.accountLast4 || '',
              accountType,
              accountNumberEphemeral: account || undefined,
            }
          : undefined,
      form8888:
        method === 'direct_deposit' && split8888
          ? [
              {
                id: 'alloc-1',
                amount: verifiedRefund,
                routingNumber: routing,
                accountLast4: accountLast4(account) || existing?.deposit?.accountLast4 || '',
                accountType,
              },
            ]
          : undefined,
    }
    const v = validateRefundDelivery(draft, verifiedRefund)
    if (!v.ok) {
      setMsg(v.errors.join(' '))
      return
    }
    const saved = sanitizeRefundDeliveryForStorage(draft)
    actions.saveRefundDelivery(saved)
    setAccount('') // clear full account from UI memory after save
    setMsg(
      v.warnings.length
        ? `Saved. ${v.warnings.join(' ')}`
        : `Refund delivery saved (${REFUND_DELIVERY_LABELS[method]}). Account shown as ${maskAccountNumber(saved.deposit?.accountLast4 ? `0000${saved.deposit.accountLast4}` : '****')}.`,
    )
  }

  return (
    <section className="filing-panel" data-testid="refund-delivery">
      <p className="eyebrow">Mandatory before e-file</p>
      <h2>Refund delivery</h2>
      <p className="muted">
        Uses your <strong>verified</strong> refund calculation ({formatMoney(verifiedRefund)}) from the AI Refund
        Maximizer — not hypothetical potential savings.
      </p>

      <div className="delivery-options">
        {(Object.keys(REFUND_DELIVERY_LABELS) as RefundDeliveryMethod[]).map((m) => (
          <label key={m} className={`delivery-option ${method === m ? 'selected' : ''}`}>
            <input
              type="radio"
              name="refundMethod"
              checked={method === m}
              onChange={() => setMethod(m)}
            />
            <span>{REFUND_DELIVERY_LABELS[m]}</span>
          </label>
        ))}
      </div>

      {method === 'direct_deposit' && (
        <div className="delivery-fields">
          <label>
            <input type="checkbox" checked={split8888} onChange={(e) => setSplit8888(e.target.checked)} /> Use Form
            8888 allocation (split refund) — demo supports one allocation totaling the verified refund
          </label>
          <label>
            Routing number
            <input
              value={routing}
              onChange={(e) => setRouting(e.target.value.replace(/\D/g, '').slice(0, 9))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="9 digits"
            />
            {routing.length === 9 && !isValidRoutingNumber(routing) && (
              <span className="field-error">Routing number failed ABA check</span>
            )}
          </label>
          <label>
            Account number
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value.replace(/\D/g, '').slice(0, 17))}
              inputMode="numeric"
              autoComplete="off"
              placeholder={existing?.deposit?.accountLast4 ? `••••${existing.deposit.accountLast4}` : 'Account number'}
            />
          </label>
          <label>
            Account type
            <select value={accountType} onChange={(e) => setAccountType(e.target.value as BankAccountType)}>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </label>
        </div>
      )}

      {method === 'bank_product' && provider && (
        <div className="delivery-fields">
          <p className="muted">{provider.disclosure}</p>
          <label>
            Provider configuration
            <select value={providerId} onChange={(e) => setProviderId(e.target.value)}>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} ({p.selectionMode.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </label>
          <label>
            Product
            <select value={productCode} onChange={(e) => setProductCode(e.target.value)}>
              {provider.products.map((pr) => (
                <option key={pr.code} value={pr.code}>
                  {pr.name}
                </option>
              ))}
            </select>
          </label>
          {eligibility && (
            <p className={`eligibility ${eligibility.eligibleToApply ? 'ok' : 'blocked'}`} role="status">
              Status: {eligibility.status.replace(/_/g, ' ')}. {eligibility.reasons.join(' ')}
            </p>
          )}
        </div>
      )}

      {method === 'paper_check' && (
        <p className="muted">IRS will mail a paper check to the address on the return when a refund is due.</p>
      )}

      <label className="auth-check">
        <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} /> I authorize
        this refund delivery method for the verified refund amount shown above.
      </label>

      <button className="btn btn-primary" type="button" onClick={save}>
        Save refund delivery
      </button>
      {msg && (
        <p className="muted" role="status">
          {msg}
        </p>
      )}
      {existing && (
        <p className="muted">
          Current selection: {REFUND_DELIVERY_LABELS[existing.method]}
          {existing.deposit ? ` · account ${maskAccountNumber(`0000${existing.deposit.accountLast4}`)}` : ''}
        </p>
      )}
    </section>
  )
}
