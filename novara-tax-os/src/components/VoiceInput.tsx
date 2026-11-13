import { lazy, Suspense } from 'react'

const IS_DEV = import.meta.env.DEV

/** DEV-only chunk outside the published app tree — never loads vendor STT in production. */
const VoiceInputDev = IS_DEV
  ? lazy(() => import('@dev-fixtures/VoiceInputDev').then((m) => ({ default: m.VoiceInputDev })))
  : null

/**
 * Optional voice input. Production stays typing-only so tax answers are not
 * sent to a third-party speech service. Local DEV may use browser STT.
 */
export function VoiceInput(props: {
  onTranscript: (text: string, meta: { confidence: 'high' | 'low' }) => void
  disabled?: boolean
  labelStart?: string
  labelStop?: string
}) {
  if (!IS_DEV || !VoiceInputDev) {
    return (
      <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
        Spoken answers stay on-device for now — type to NOVARA. Cloud speech recognition is disabled in the published
        app so tax details are not sent to a browser vendor service.
      </p>
    )
  }

  return (
    <Suspense fallback={<p className="muted">Loading voice…</p>}>
      <VoiceInputDev {...props} />
    </Suspense>
  )
}
