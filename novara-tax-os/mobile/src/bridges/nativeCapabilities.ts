/**
 * Native capability bridges used by the Capacitor shell.
 * Falls back safely when plugins are unavailable (web / CI).
 * Live payments / IRS transmit remain governed by web production locks.
 */

export type NativePlatform = 'ios' | 'android' | 'web'

export interface BiometricAuthResult {
  ok: boolean
  method?: 'face' | 'fingerprint' | 'none'
  error?: string
}

export interface ScanDocumentResult {
  ok: boolean
  /** Local URI only — upload must go through authenticated vault APIs */
  localUri?: string
  mimeType?: string
  error?: string
}

export interface PushRegistrationResult {
  ok: boolean
  tokenPresent: boolean
  error?: string
}

export function detectNativePlatform(
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): NativePlatform {
  if (/android/i.test(userAgent)) return 'android'
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  return 'web'
}

/** Prefer biometric unlock for returning sessions — never stores SSN/ETIN in Keychain via this stub. */
export async function requestBiometricUnlock(): Promise<BiometricAuthResult> {
  // Capacitor Biometric plugin is owner-installed; stub denies in CI/web.
  if (detectNativePlatform() === 'web') {
    return { ok: false, method: 'none', error: 'biometric_unavailable_on_web' }
  }
  return { ok: false, method: 'none', error: 'biometric_plugin_not_wired_until_cap_sync' }
}

/** Document scan → local URI; upload path must enforce tenant authz on server. */
export async function scanTaxDocument(): Promise<ScanDocumentResult> {
  if (detectNativePlatform() === 'web') {
    return { ok: false, error: 'use_web_file_input' }
  }
  return { ok: false, error: 'camera_plugin_not_wired_until_cap_sync' }
}

export async function registerPushNotifications(): Promise<PushRegistrationResult> {
  return { ok: false, tokenPresent: false, error: 'push_requires_owner_apns_fcm_credentials' }
}

export interface MobileFeatureFlag {
  id: string
  label: string
  ios: 'ready' | 'scaffold' | 'blocked_owner'
  android: 'ready' | 'scaffold' | 'blocked_owner'
}

export function mobileFeatureMatrix(): MobileFeatureFlag[] {
  return [
    { id: 'tc_dashboard', label: 'Tax Client login & dashboard', ios: 'ready', android: 'ready' },
    { id: 'tp_dashboard', label: 'Tax Preparer login & dashboard', ios: 'ready', android: 'ready' },
    { id: 'office_dashboard', label: 'Tax Office login & dashboard', ios: 'ready', android: 'ready' },
    { id: 'doc_scan', label: 'Secure document scanning & uploads', ios: 'scaffold', android: 'scaffold' },
    { id: 'ai_prep', label: 'AI-powered tax preparation workflow', ios: 'ready', android: 'ready' },
    { id: 'esign', label: 'Tax review & electronic signature', ios: 'ready', android: 'ready' },
    { id: 'payments', label: 'Subscription & payment (sandbox / policy-compliant)', ios: 'scaffold', android: 'scaffold' },
    { id: 'filing_status', label: 'Filing status tracking', ios: 'ready', android: 'ready' },
    { id: 'push', label: 'Secure notifications', ios: 'blocked_owner', android: 'blocked_owner' },
    { id: 'biometric', label: 'Biometric authentication', ios: 'scaffold', android: 'scaffold' },
    { id: 'account_mgmt', label: 'Account management & deletion', ios: 'ready', android: 'ready' },
    { id: 'branding', label: 'Professional NOVARA branding', ios: 'ready', android: 'ready' },
  ]
}

export const APPLE_IAP_POLICY_NOTE =
  'Digital software subscriptions may require Apple In-App Purchase when sold inside the iOS app. Prefer linking to web checkout only where App Store Review Guidelines permit; owner/counsel must confirm model before submission.'
