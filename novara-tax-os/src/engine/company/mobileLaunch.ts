/**
 * Mobile distribution checklist for branded iOS / Android apps.
 * Native apps are not yet in-repo — web responsive only.
 */

export type MobilePlatform = 'ios' | 'android' | 'web_responsive'

export interface MobileLaunchItem {
  platform: MobilePlatform
  status: 'available' | 'account_required' | 'not_built' | 'blocked'
  requirement: string
  ownerAction: string
}

export function mobileDistributionChecklist(): MobileLaunchItem[] {
  return [
    {
      platform: 'web_responsive',
      status: 'available',
      requirement: 'Branded responsive web application',
      ownerAction: 'Authorize official domain cutover when production ready',
    },
    {
      platform: 'ios',
      status: 'account_required',
      requirement: 'Capacitor iOS shell (mobile/) + App Store listing package',
      ownerAction:
        'Apple Developer enrollment ($99/yr); macOS signed IPA + TestFlight; see mobile/store/ios/',
    },
    {
      platform: 'android',
      status: 'account_required',
      requirement: 'Capacitor Android shell (mobile/) + Play listing package',
      ownerAction:
        'Play Console enrollment ($25); signed AAB; see mobile/store/android/',
    },
  ]
}

export function mobileBlocksNationalClaim(): string[] {
  return mobileDistributionChecklist()
    .filter((i) => i.platform !== 'web_responsive' && i.status !== 'available')
    .map((i) => `${i.platform}:${i.status}`)
}
