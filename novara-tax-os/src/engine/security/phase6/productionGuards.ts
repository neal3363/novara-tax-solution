/**
 * Production path guards — guest auto-login removal when production auth path enabled.
 * Default OFF so existing sample/public guest flows keep working until approved.
 */

import { getPhase6Flags } from './config'
import { appendAudit } from './auditLog'

export type AuthPathMode = 'local_sample' | 'public_guest' | 'production'

export function isGuestAutoLoginAllowed(mode: AuthPathMode): boolean {
  const flags = getPhase6Flags()
  if (!flags.productionAuthPath && !flags.rejectGuestOnProductionApis) {
    // Legacy paths remain available until production auth is switched on
    return mode === 'local_sample' || mode === 'public_guest'
  }
  // Production security path: guest auto-login removed
  return false
}

export function assertApiCallerNotGuest(principalId: string, mode: AuthPathMode = 'production'): void {
  const flags = getPhase6Flags()
  const looksGuest =
    principalId.startsWith('guest-') ||
    principalId.includes('public.novara.local') ||
    principalId.includes('sample.novara.local')
  if ((flags.productionAuthPath || flags.rejectGuestOnProductionApis || mode === 'production') && looksGuest) {
    appendAudit({
      actorId: principalId,
      tenantId: 'n/a',
      action: 'security_incident',
      resource: 'api:guest_blocked',
      outcome: 'denied',
      meta: { mode },
    })
    throw new Error('guest_forbidden')
  }
}

export function productionAuthStatus(): {
  guestAutoLoginAllowedOnProduction: false
  enforcementEnabled: boolean
  mfaMandatory: boolean
  message: string
} {
  const flags = getPhase6Flags()
  return {
    guestAutoLoginAllowedOnProduction: false,
    enforcementEnabled: flags.productionAuthPath,
    mfaMandatory: flags.mfaMandatoryForExistingUsers,
    message: flags.productionAuthPath
      ? 'Production auth path ON — guest auto-login blocked'
      : 'Production auth path OFF — existing guest sample flows unchanged (STOP before enforce)',
  }
}
