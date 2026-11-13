/**
 * Prior-return import from supported exports (PDF / structured JSON).
 * Never blindly reuse filing status, dependents, or amounts — confirmation required.
 * Proprietary vendor formats need authorized integrations (sandbox labeled).
 */

export type ImportVendor = 'turbotax' | 'hrblock' | 'taxact' | 'drake' | 'proseries' | 'lacerte' | 'generic_pdf' | 'generic_json'

export interface ImportedReturnDraft {
  vendor: ImportVendor
  taxYear: number
  confidence: number
  taxpayerName?: string
  spouseName?: string
  filingStatus?: string
  dependentNames: string[]
  wages?: number
  withholding?: number
  uncertainFields: string[]
  warnings: string[]
  rawSourceLabel: string
}

export function detectVendorFromFilename(name: string): ImportVendor {
  const n = name.toLowerCase()
  if (n.includes('turbo')) return 'turbotax'
  if (n.includes('hrblock') || n.includes('h&r') || n.includes('block')) return 'hrblock'
  if (n.includes('taxact')) return 'taxact'
  if (n.includes('drake')) return 'drake'
  if (n.includes('proseries') || n.includes('proseries')) return 'proseries'
  if (n.includes('lacerte')) return 'lacerte'
  if (n.endsWith('.json')) return 'generic_json'
  return 'generic_pdf'
}

/** Parse a supported export into a draft for human confirmation — demo deterministic extract. */
export function parsePriorReturnExport(input: {
  fileName: string
  textContent?: string
  fallbackTaxpayerName: string
}): { ok: true; draft: ImportedReturnDraft } | { ok: false; error: string } {
  const vendor = detectVendorFromFilename(input.fileName)
  const yearMatch = input.fileName.match(/(20\d{2})/)
  const taxYear = yearMatch ? Number(yearMatch[1]) : new Date().getUTCFullYear() - 1

  // Structured JSON path — prefer parsing when content looks like JSON (even if filename names a vendor)
  if (input.textContent && (vendor === 'generic_json' || input.fileName.toLowerCase().endsWith('.json'))) {
    try {
      const data = JSON.parse(input.textContent) as Record<string, unknown>
      const draft: ImportedReturnDraft = {
        vendor: vendor === 'generic_json' ? 'generic_json' : vendor,
        taxYear: Number(data.taxYear ?? taxYear),
        confidence: 0.82,
        taxpayerName: String(data.taxpayerName ?? input.fallbackTaxpayerName),
        spouseName: data.spouseName ? String(data.spouseName) : undefined,
        filingStatus: data.filingStatus ? String(data.filingStatus) : undefined,
        dependentNames: Array.isArray(data.dependents)
          ? (data.dependents as { name?: string }[]).map((d) => d.name ?? '').filter(Boolean)
          : [],
        wages: typeof data.wages === 'number' ? data.wages : undefined,
        withholding: typeof data.withholding === 'number' ? data.withholding : undefined,
        uncertainFields: ['filingStatus', 'dependent eligibility', 'credit amounts'],
        warnings: [
          'Confirm every imported fact for the current year. Do not reuse prior-year filing status or dependent eligibility automatically.',
          'Sandbox import — not a live vendor API integration.',
        ],
        rawSourceLabel: input.fileName,
      }
      return { ok: true, draft }
    } catch {
      return { ok: false, error: 'Could not parse JSON export.' }
    }
  }

  // PDF / proprietary — labeled sandbox mapping from filename cues only
  const draft: ImportedReturnDraft = {
    vendor,
    taxYear,
    confidence: 0.55,
    taxpayerName: input.fallbackTaxpayerName,
    dependentNames: [],
    uncertainFields: [
      'All amounts',
      'Filing status',
      'Dependents',
      'Credits',
      'Business schedules',
    ],
    warnings: [
      `Import from ${vendor} is in sandbox mode. Proprietary files require an authorized integration or supported parser.`,
      'Review the confirmation screen before applying any values to a working return.',
      'Never treat prior-year credits or dependent claims as current-year facts without re-verification.',
    ],
    rawSourceLabel: input.fileName,
  }
  return { ok: true, draft }
}
