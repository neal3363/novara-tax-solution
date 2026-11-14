/**
 * IRS rejection code interpretation catalog (subset for sandbox testing).
 * Messages are explanatory for developers — not a complete IRS R&C catalog.
 */

export interface RejectCodeInfo {
  code: string
  message: string
  category: 'identity' | 'schema' | 'business_rule' | 'duplicate' | 'authorization' | 'transmitter' | 'other'
  correctionHint: string
}

export const REJECT_CODE_CATALOG: Record<string, RejectCodeInfo> = {
  'R0000-900': {
    code: 'R0000-900',
    message: 'Duplicate submission detected for this return',
    category: 'duplicate',
    correctionHint: 'Do not retransmit unchanged; wait for prior ACK or file as correction.',
  },
  'F1040-512': {
    code: 'F1040-512',
    message: 'Primary TIN and name control mismatch (simulated)',
    category: 'identity',
    correctionHint: 'Verify synthetic TIN mask and name control; correct and resubmit.',
  },
  'IND-181': {
    code: 'IND-181',
    message: 'Missing Form 8879 / e-file authorization',
    category: 'authorization',
    correctionHint: 'Obtain taxpayer Form 8879 authorization before transmit.',
  },
  'X0000-005': {
    code: 'X0000-005',
    message: 'XML schema validation failed',
    category: 'schema',
    correctionHint: 'Fix XML validation errors and resubmit.',
  },
  'T0000-014': {
    code: 'T0000-014',
    message: 'Transmitter / EFIN not authorized (simulated)',
    category: 'transmitter',
    correctionHint: 'Complete IRS provider testing; entered EFIN alone is insufficient.',
  },
  'R0000-502': {
    code: 'R0000-502',
    message: 'Business rule failure on return data',
    category: 'business_rule',
    correctionHint: 'Review AGI/tax/payment consistency and form attachments.',
  },
}

export function interpretRejectCodes(codes: string[]): RejectCodeInfo[] {
  return codes.map(
    (code) =>
      REJECT_CODE_CATALOG[code] ?? {
        code,
        message: `Unrecognized rejection code ${code}`,
        category: 'other',
        correctionHint: 'Consult IRS MeF rejection handbook when available.',
      },
  )
}
