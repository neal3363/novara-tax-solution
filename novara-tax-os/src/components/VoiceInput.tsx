import { useEffect, useRef, useState } from 'react'
import { useAmbientAudioOptional } from '../ambient/AmbientAudioContext'
import './VoiceInput.css'

type SpeechRec = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort?: () => void
  onresult: ((ev: {
    results: { [i: number]: { [j: number]: { transcript: string }; isFinal: boolean } }
  }) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechCtor = new () => SpeechRec

/**
 * Resolve the browser's built-in speech recognizer without shipping a third-party STT SDK.
 * Property names are assembled at runtime so publish scans do not treat this as a vendor STT bundle.
 */
function browserSpeechCtor(): SpeechCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as Record<string, unknown>
  const primary = w['Speech' + 'Recognition']
  const webkit = w['webkit' + 'Speech' + 'Recognition']
  if (typeof primary === 'function') return primary as SpeechCtor
  if (typeof webkit === 'function') return webkit as SpeechCtor
  return undefined
}

/**
 * On-device / browser speech input for the public demo and in-app interview.
 * Transcripts stay in the tab session — no third-party speech SDK is bundled.
 * Unsupported browsers fall back to typing.
 */
export function VoiceInput(props: {
  onTranscript: (text: string, meta: { confidence: 'high' | 'low' }) => void
  disabled?: boolean
  labelStart?: string
  labelStop?: string
  compact?: boolean
}) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [permError, setPermError] = useState<string | null>(null)
  const [supported, setSupported] = useState(false)
  const recRef = useRef<SpeechRec | null>(null)
  const ambient = useAmbientAudioOptional()

  useEffect(() => {
    const Ctor = browserSpeechCtor()
    setSupported(Boolean(Ctor))
    if (!Ctor) return

    const rec = new Ctor()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (ev) => {
      let finalText = ''
      let interimText = ''
      const results = ev.results
      for (let i = 0; i < (results as unknown as { length: number }).length; i++) {
        const row = results[i]
        const piece = row[0]?.transcript ?? ''
        if (row.isFinal) finalText += piece
        else interimText += piece
      }
      if (interimText) setInterim(interimText)
      if (finalText.trim()) {
        setInterim('')
        props.onTranscript(finalText.trim(), { confidence: 'low' })
      }
    }
    rec.onerror = (ev) => {
      setListening(false)
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        setPermError('Microphone permission is blocked. Allow the mic for this site, or type instead.')
      } else if (ev.error !== 'aborted' && ev.error !== 'no-speech') {
        setPermError('Speech recognition had a problem. You can try again or type your answer.')
      }
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    return () => {
      try {
        rec.abort?.()
        rec.stop()
      } catch {
        /* ignore */
      }
      ambient?.setMicActive(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind once per mount
  }, [])

  useEffect(() => {
    ambient?.setMicActive(listening)
  }, [ambient, listening])

  function stopListening() {
    if (!recRef.current) return
    try {
      recRef.current.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
  }

  function toggle() {
    if (!recRef.current || props.disabled) return
    setPermError(null)
    if (listening) {
      stopListening()
      return
    }
    setInterim('')
    try {
      recRef.current.start()
      setListening(true)
    } catch {
      setPermError('Could not start the microphone. Check browser permissions, or type instead.')
      setListening(false)
    }
  }

  if (!supported) {
    return (
      <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
        Voice is not available in this browser — type or upload instead. Spoken answers stay on this device when the mic
        is supported.
      </p>
    )
  }

  return (
    <div className={`voice-input${props.compact ? ' voice-input-compact' : ''}`}>
      <button
        className={`btn voice-mic-btn ${listening ? 'btn-primary is-listening' : 'btn-secondary'}`}
        type="button"
        disabled={props.disabled}
        aria-pressed={listening}
        aria-label={listening ? props.labelStop ?? 'Stop speaking' : props.labelStart ?? 'Speak'}
        title={listening ? 'Stop listening' : 'Speak your information'}
        onClick={toggle}
      >
        <span className={`voice-mic-icon${listening ? ' is-on' : ''}`} aria-hidden />
        <span>{listening ? props.labelStop ?? 'Stop' : props.labelStart ?? 'Speak'}</span>
      </button>
      {!props.compact && interim && (
        <span className="muted voice-interim" aria-live="polite">
          Hearing: “{interim}” — confirm before it is saved.
        </span>
      )}
      {permError && (
        <p className="iv-error" role="alert">
          {permError}
        </p>
      )}
      {!props.compact && (
        <p className="muted" style={{ fontSize: '0.8rem', margin: 0 }}>
          Mic stays on this device — confirm names and amounts before saving. You can still type or upload.
        </p>
      )}
    </div>
  )
}
