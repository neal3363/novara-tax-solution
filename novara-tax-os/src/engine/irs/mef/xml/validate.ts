/**
 * Pre-submission XML / business-rule validation (sandbox structural checks).
 * When official IRS ATS access is approved, replace/augment with real XSD validation.
 */

import {
  efileSchemaVersion,
  findUnsupportedForms,
  isSupportedReturnType,
  isSupportedTaxYear,
} from '../schema/stubs'
import type { MefSyntheticReturn, MefValidationIssue, MefValidationResult, MefXmlDocument } from '../types'

export function validateReturnPayload(ret: MefSyntheticReturn): MefValidationResult {
  const issues: MefValidationIssue[] = []
  const schemaVersion = efileSchemaVersion(ret.taxYear)

  if (!isSupportedTaxYear(ret.taxYear)) {
    issues.push({
      code: 'MEF-YEAR-001',
      severity: 'error',
      message: `Tax year ${ret.taxYear} is not supported for MeF composition`,
      path: 'TaxYear',
    })
  }
  if (!isSupportedReturnType(ret.returnType) || ret.returnType === 'unsupported') {
    issues.push({
      code: 'MEF-TYPE-001',
      severity: 'error',
      message: `Return type ${ret.returnType} is not supported`,
      path: 'ReturnType',
    })
  }
  const unsupported = findUnsupportedForms([...ret.formsIncluded, ...ret.schedulesIncluded])
  for (const f of unsupported) {
    issues.push({
      code: 'MEF-FORM-001',
      severity: 'error',
      message: `Unsupported tax form for MeF: ${f}`,
      path: 'FormIncluded',
    })
  }
  if (!ret.primaryName.trim()) {
    issues.push({ code: 'MEF-NAME-001', severity: 'error', message: 'Primary name required', path: 'PrimaryName' })
  }
  if (!/^\*{3}-\*{2}-\d{4}$|^\d{3}-\d{2}-\d{4}$|^SYN-\d+$/.test(ret.primaryTinMasked) && !ret.primaryTinMasked.includes('*')) {
    // Allow synthetic masks only — reject obviously raw patterns without mask in tests we control
    if (/^\d{9}$/.test(ret.primaryTinMasked)) {
      issues.push({
        code: 'MEF-TIN-001',
        severity: 'error',
        message: 'Unmasked TIN forbidden in synthetic MeF payloads',
        path: 'PrimaryTINMasked',
      })
    }
  }
  if (ret.filingStatus === 'mfj' && !ret.spouseName) {
    issues.push({
      code: 'MEF-MFJ-001',
      severity: 'error',
      message: 'Spouse name required for MFJ',
      path: 'SpouseName',
    })
  }
  if (!Number.isFinite(ret.agi)) {
    issues.push({ code: 'MEF-AGI-001', severity: 'error', message: 'AGI must be numeric', path: 'AGI' })
  }

  return {
    ok: issues.every((i) => i.severity !== 'error'),
    schemaVersion,
    issues,
    validatedAt: new Date().toISOString(),
  }
}

export function validateComposedXml(doc: MefXmlDocument, ret: MefSyntheticReturn): MefValidationResult {
  const base = validateReturnPayload(ret)
  const issues = [...base.issues]

  if (!doc.xml.includes('<?xml')) {
    issues.push({ code: 'MEF-XML-001', severity: 'error', message: 'Missing XML declaration' })
  }
  if (!doc.xml.includes('<Return')) {
    issues.push({ code: 'MEF-XML-002', severity: 'error', message: 'Missing Return root element' })
  }
  if (!doc.xml.includes(`<TaxYear>${ret.taxYear}</TaxYear>`)) {
    issues.push({ code: 'MEF-XML-003', severity: 'error', message: 'TaxYear mismatch in XML' })
  }
  if (!doc.xml.includes('synthetic="true"') && !doc.xml.includes('<Synthetic>true</Synthetic>')) {
    issues.push({
      code: 'MEF-XML-004',
      severity: 'error',
      message: 'Synthetic marker required — refuse unlabeled production-like payloads',
    })
  }
  if (doc.xml.includes('<LiveIrsTransmit>true</LiveIrsTransmit>')) {
    issues.push({
      code: 'MEF-XML-005',
      severity: 'error',
      message: 'Live IRS transmit flag forbidden in Phase 8',
    })
  }
  // Reject obviously broken XML
  if ((doc.xml.match(/<Return\b/g) ?? []).length !== (doc.xml.match(/<\/Return>/g) ?? []).length) {
    issues.push({ code: 'MEF-XML-006', severity: 'error', message: 'Malformed Return element nesting' })
  }

  return {
    ok: issues.every((i) => i.severity !== 'error'),
    schemaVersion: doc.schemaVersion,
    issues,
    validatedAt: new Date().toISOString(),
  }
}

/** Test helper: mark XML invalid by stripping required nodes. */
export function corruptXmlForTests(xml: string): string {
  return xml.replace(/<ReturnHeader>[\s\S]*?<\/ReturnHeader>/, '<ReturnHeader></ReturnHeader>')
}
