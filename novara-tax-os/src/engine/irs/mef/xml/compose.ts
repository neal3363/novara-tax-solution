/**
 * Tax-year-specific XML return composition (synthetic sandbox).
 * Produces MeF-shaped XML for validation/testing — not a full IRS production payload.
 */

import { efileSchemaVersion, isSupportedReturnType, isSupportedTaxYear } from '../schema/stubs'
import type { MefSyntheticReturn, MefXmlDocument } from '../types'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function simpleHash(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `xh_${(h >>> 0).toString(16).padStart(8, '0')}`
}

export function composeReturnXml(ret: MefSyntheticReturn): MefXmlDocument {
  if (!isSupportedTaxYear(ret.taxYear)) {
    throw new Error(`unsupported_tax_year:${ret.taxYear}`)
  }
  if (!isSupportedReturnType(ret.returnType)) {
    throw new Error(`unsupported_return_type:${ret.returnType}`)
  }

  const schemaVersion = efileSchemaVersion(ret.taxYear)
  const ns = `http://www.irs.gov/efile`
  const schedules = ret.schedulesIncluded
    .map((s) => `    <ScheduleIncluded>${escapeXml(s)}</ScheduleIncluded>`)
    .join('\n')
  const forms = ret.formsIncluded
    .map((f) => `    <FormIncluded>${escapeXml(f)}</FormIncluded>`)
    .join('\n')

  const composedAt = new Date().toISOString()
  // Stable body (no wall-clock) so duplicate-transmission detection works.
  const stableBody = [
    ret.taxYear,
    ret.returnType,
    ret.filingStatus,
    ret.primaryTinMasked,
    ret.primaryName,
    ret.spouseName ?? '',
    ret.submissionLocalId,
    ret.agi,
    ret.totalTax,
    ret.totalPayments,
    ret.refundOrBalanceDue,
    ret.formsIncluded.join(','),
    ret.schedulesIncluded.join(','),
  ].join('|')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Return xmlns="${ns}" returnVersion="${schemaVersion}" synthetic="true" environment="ats_mock">
  <ReturnHeader>
    <TaxYear>${ret.taxYear}</TaxYear>
    <ReturnType>${escapeXml(ret.returnType)}</ReturnType>
    <FilingStatus>${escapeXml(ret.filingStatus)}</FilingStatus>
    <PrimaryTINMasked>${escapeXml(ret.primaryTinMasked)}</PrimaryTINMasked>
    <PrimaryName>${escapeXml(ret.primaryName)}</PrimaryName>
    ${ret.spouseName ? `<SpouseName>${escapeXml(ret.spouseName)}</SpouseName>` : ''}
    <SubmissionLocalId>${escapeXml(ret.submissionLocalId)}</SubmissionLocalId>
    <Timestamp>${composedAt}</Timestamp>
  </ReturnHeader>
  <ReturnData>
    <AGI>${ret.agi}</AGI>
    <TotalTax>${ret.totalTax}</TotalTax>
    <TotalPayments>${ret.totalPayments}</TotalPayments>
    <RefundOrBalanceDue>${ret.refundOrBalanceDue}</RefundOrBalanceDue>
${forms}
${schedules}
  </ReturnData>
  <NovaraMeta>
    <Synthetic>true</Synthetic>
    <LiveIrsTransmit>false</LiveIrsTransmit>
  </NovaraMeta>
</Return>
`

  return {
    taxYear: ret.taxYear,
    returnType: ret.returnType,
    xml,
    schemaVersion,
    contentHash: simpleHash(stableBody),
    composedAt,
    synthetic: true,
  }
}
