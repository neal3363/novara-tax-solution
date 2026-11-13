declare module '@dev-fixtures/seed.dev' {
  import type { DocumentRecord, OfficeStaffMember, TaxReturn, UserAccount } from '../data/types'
  export const DEV_DEMO_USERS: UserAccount[]
  export const DEV_SEED_RETURNS: TaxReturn[]
  export const DEV_SEED_DOCS: DocumentRecord[]
  export const DEV_SEED_OFFICE_STAFF: OfficeStaffMember[]
}

declare module '@dev-fixtures/VoiceInputDev' {
  import type { ComponentType } from 'react'
  export const VoiceInputDev: ComponentType<{
    onTranscript: (text: string, meta: { confidence: 'high' | 'low' }) => void
    disabled?: boolean
    labelStart?: string
    labelStop?: string
  }>
}
