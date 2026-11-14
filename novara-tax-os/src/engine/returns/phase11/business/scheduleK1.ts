/**
 * Schedule K-1 generation from partnership / S-corp ordinary income.
 * Isolated staging — not MeF XML.
 */

import type { BusinessPartner, BusinessShareholder, ScheduleK1 } from '../types'

function allocate(amount: number, percent: number): number {
  return Math.round(amount * (percent / 100))
}

export function generatePartnershipK1s(
  ordinaryBusinessIncome: number,
  partners: BusinessPartner[],
): ScheduleK1[] {
  const totalPct = partners.reduce((s, p) => s + p.ownershipPercent, 0)
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error('Partnership ownership percents must total 100')
  }
  return partners.map((p) => {
    const ordinary = allocate(ordinaryBusinessIncome, p.ownershipPercent)
    return {
      form: 'Schedule K-1 (Form 1065)' as const,
      partnerOrShareholderId: p.id,
      name: p.name,
      ownershipPercent: p.ownershipPercent,
      ordinaryBusinessIncome: ordinary,
      lines: [
        { box: '1', label: 'Ordinary business income (loss)', amount: ordinary },
        { box: 'J', label: 'Partner share of profit %', amount: p.ownershipPercent },
      ],
      productionReady: false,
    }
  })
}

export function generateSCorpK1s(
  ordinaryBusinessIncome: number,
  shareholders: BusinessShareholder[],
): ScheduleK1[] {
  const totalPct = shareholders.reduce((s, p) => s + p.ownershipPercent, 0)
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error('S-corp ownership percents must total 100')
  }
  return shareholders.map((p) => {
    const ordinary = allocate(ordinaryBusinessIncome, p.ownershipPercent)
    return {
      form: 'Schedule K-1 (Form 1120-S)' as const,
      partnerOrShareholderId: p.id,
      name: p.name,
      ownershipPercent: p.ownershipPercent,
      ordinaryBusinessIncome: ordinary,
      lines: [
        { box: '1', label: 'Ordinary business income (loss)', amount: ordinary },
        { box: 'F', label: 'Shareholder stock ownership %', amount: p.ownershipPercent },
      ],
      productionReady: false,
    }
  })
}
