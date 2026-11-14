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
      status: 'not_built',
      requirement: 'Native or wrapped iOS app + App Store listing',
      ownerAction: 'Apple Developer enrollment ($99/yr); App Review when binary exists',
    },
    {
      platform: 'android',
      status: 'not_built',
      requirement: 'Native or wrapped Android app + Play listing',
      ownerAction: 'Play Console enrollment ($25); store listing when AAB exists',
    },
  ]
}

export function mobileBlocksNationalClaim(): string[] {
  return mobileDistributionChecklist()
    .filter((i) => i.platform !== 'web_responsive' && i.status !== 'available')
    .map((i) => `${i.platform}:${i.status}`)
}
