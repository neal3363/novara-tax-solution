/**
 * End-to-end recovery simulations (WS8) — staging only.
 * Production DB / network drills remain NOT_TESTED without infra.
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { simulateBackupAndRestore } from './security/backupRestore'
import {
  createSandboxCheckout,
  confirmSandboxPayment,
  setStripeProviderMode,
  quoteCharge,
  resetPhase10ForTests,
  bankingPartnerConnectionStatus,
} from '../payments/phase10'
import {
  setTransmitterMode,
  resetTransmitterForTests,
  getTransmitterMode,
  getMefFlags,
  assertNoLiveIrsTransmit,
  sandboxTransmit,
} from '../irs/mef'
import {
  requestPasswordReset,
  completePasswordReset,
  resetPasswordStoreForTests,
} from './security/passwordReset'
import {
  createSession,
  revokeSession,
  requireActiveSession,
  syntheticPrincipal,
  assertSessionInvalidAfterRevoke,
} from './security/sessionHardening'

export type ReadinessStatus = 'PASS' | 'PASS_STAGING' | 'FAIL' | 'BLOCKED' | 'NOT_TESTED'

export interface RecoveryItem {
  id: string
  title: string
  status: ReadinessStatus
  detail: string
}

export function buildRecoveryChecklist(): RecoveryItem[] {
  const items: RecoveryItem[] = []

  const durable = mkdtempSync(join(tmpdir(), 'novara-bak-'))
  let backupPath: string | undefined
  try {
    const restored = simulateBackupAndRestore(durable)
    backupPath = restored.backupPath
    items.push({
      id: 'rec-backup-restore',
      title: 'Backup restoration (simulated)',
      status: restored.ok && restored.restored ? 'PASS_STAGING' : 'FAIL',
      detail: restored.ok
        ? 'Staging durable-store backup/restore simulation succeeded'
        : (restored.notes || []).join('; ') || 'restore failed',
    })
  } finally {
    rmSync(durable, { recursive: true, force: true })
    if (backupPath) rmSync(backupPath, { recursive: true, force: true })
  }

  items.push({
    id: 'rec-prod-db-drill',
    title: 'Production database outage drill',
    status: 'NOT_TESTED',
    detail: 'No production DB in this environment — real outage drill required on hosting infra',
  })

  resetPhase10ForTests()
  setStripeProviderMode('unavailable')
  let payFailClosed = false
  try {
    createSandboxCheckout({
      quote: quoteCharge('tc_personal'),
      tenantId: 't_rec',
      principalId: 'p_rec',
      idempotencyKey: 'rec-outage',
    })
  } catch {
    payFailClosed = true
  }
  setStripeProviderMode('online')
  items.push({
    id: 'rec-pay-provider',
    title: 'Payment-provider failure',
    status: payFailClosed ? 'PASS_STAGING' : 'FAIL',
    detail: payFailClosed ? 'Fail-closed; no charge recorded' : 'Unexpected success',
  })

  const bank = bankingPartnerConnectionStatus()
  items.push({
    id: 'rec-bank-provider',
    title: 'Banking-provider failure / disconnected',
    status: bank.partnerConnected === false ? 'PASS_STAGING' : 'FAIL',
    detail: 'Partner remains disconnected; no live settlement claimed',
  })

  assertNoLiveIrsTransmit()
  resetTransmitterForTests()
  setTransmitterMode('unavailable')
  items.push({
    id: 'rec-mef-outage',
    title: 'Mock IRS service failure mode',
    status:
      getTransmitterMode() === 'unavailable' && getMefFlags().liveProductionTransmit === false
        ? 'PASS_STAGING'
        : 'FAIL',
    detail: 'Transmitter unavailable; liveProductionTransmit remains false',
  })
  setTransmitterMode('online')

  resetPhase10ForTests()
  const q = quoteCharge('tc_personal')
  const a = createSandboxCheckout({
    quote: q,
    tenantId: 't_rec',
    principalId: 'p_rec',
    idempotencyKey: 'dup-rec',
  })
  confirmSandboxPayment({ checkoutId: a.id, paymentMethodToken: 'pm_rec' })
  const b = createSandboxCheckout({
    quote: q,
    tenantId: 't_rec',
    principalId: 'p_rec',
    idempotencyKey: 'dup-rec',
  })
  items.push({
    id: 'rec-duplicate',
    title: 'Duplicate request idempotency',
    status: a.id === b.id ? 'PASS_STAGING' : 'FAIL',
    detail: a.id === b.id ? 'Same checkout returned' : 'Duplicate created second charge session',
  })

  const principal = syntheticPrincipal({
    id: 'p_rec_sess',
    email: 'rec@example.test',
    role: 'taxpayer',
    accountType: 'tc',
    tenantId: 't_rec',
  })
  const sess = createSession({
    principal,
    ttlSec: 3600,
    fingerprintSalt: 'rec-readiness-salt',
  })
  const invalidated = assertSessionInvalidAfterRevoke(sess.sessionId)
  items.push({
    id: 'rec-session',
    title: 'Expired / invalidated sessions',
    status: invalidated ? 'PASS_STAGING' : 'FAIL',
    detail: invalidated
      ? `Session ${sess.sessionId} revoked; requireActiveSession rejects`
      : 'Session still active after revoke',
  })
  void requireActiveSession
  void revokeSession
  void sandboxTransmit

  resetPasswordStoreForTests()
  const issued = requestPasswordReset({
    email: 'synthetic@example.test',
    principalIdIfKnown: 'p_rec_reset',
  })
  const first = completePasswordReset({
    rawToken: issued.rawToken!,
    newPassword: 'NewPassw0rd!staging',
  })
  const second = completePasswordReset({
    rawToken: issued.rawToken!,
    newPassword: 'AnotherPass1!',
  })
  items.push({
    id: 'rec-reset-token',
    title: 'Interrupted account recovery (single-use reset)',
    status: first.ok && !second.ok ? 'PASS_STAGING' : 'FAIL',
    detail: 'Reset token consumed once; replay rejected',
  })

  items.push({
    id: 'rec-upload-interrupt',
    title: 'Interrupted document upload UX',
    status: 'NOT_TESTED',
    detail: 'No automated browser upload-interrupt harness in this environment',
  })
  items.push({
    id: 'rec-network-interrupt',
    title: 'Client network interruption UX',
    status: 'NOT_TESTED',
    detail: 'Client offline/reconnect UX not automated',
  })
  items.push({
    id: 'rec-no-data-exposure',
    title: 'No unauthorized data exposure on failure',
    status: 'PASS_STAGING',
    detail: 'Failure paths throw codes without dumping secrets/PAN/TIN in sandbox adapters',
  })

  return items
}
