import { useEffect, useRef, useState } from 'react'
import { useAmbientAudioOptional } from '../ambient/AmbientAudioContext'

type SpeechRec = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort?: () => void
  onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string }; isFinal: boolean } } }) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRec
    webkitSpeechRecognition?: new () => SpeechRec
  }
}

/**
 * Optional browser speech recognition — never auto-starts.
 * Transcripts are uncertain until the taxpayer confirms (especially names/amounts).
 * Uses the browser vendor speech service when available (privacy disclosure in UI).
 */
export function VoiceInput(props: {
  onTranscript: (text: string, meta: { confidence: 'high' | 'low' }) => void
  disabled?: boolean
  labelStart?: string
  labelStop?: string
}) {
  const [listening, setListening] = useState(false)
  const [paused, setPaused] = useState(false)
  const [interim, setInterim] = useState('')
  const [permError, setPermError] = useState<string | null>(null)
  const recRef = useRef<SpeechRec | null>(null)
  const ambient = useAmbientAudioOptional()
  const supported =
    typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    ambient?.setMicActive(listening)
  }, [ambient, listening])

  useEffect(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
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
        // Browser STT does not expose reliable confidence — always require confirm for save
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

  function stopListening() {
    if (!recRef.current) return
    try {
      recRef.current.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
    setPaused(false)
  }

  function toggle() {
    if (!recRef.current || props.disabled) return
    setPermError(null)
    if (listening || paused) {
      stopListening()
      return
    }
    setInterim('')
    setPaused(false)
    try {
      recRef.current.start()
      setListening(true)
    } catch {
      setPermError('Could not start the microphone. Check browser permissions, or type instead.')
      setListening(false)
    }
  }

  function pauseOrResume() {
    if (!recRef.current || props.disabled) return
    setPermError(null)
    if (listening) {
      try {
        recRef.current.stop()
      } catch {
        /* ignore */
      }
      setListening(false)
      setPaused(true)
      return
    }
    if (paused) {
      try {
        recRef.current.start()
        setListening(true)
        setPaused(false)
      } catch {
        setPermError('Could not resume the microphone. Try Start speaking again, or type instead.')
        setPaused(false)
      }
    }
  }

  if (!supported) {
    return <p className="muted">Voice input is not supported in this browser. Type to NOVARA instead.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
        <button
          className={`btn ${listening ? 'btn-primary' : 'btn-secondary'}`}
          type="button"
          disabled={props.disabled}
          aria-pressed={listening}
          onClick={toggle}
        >
          {listening || paused ? props.labelStop ?? 'Stop listening' : props.labelStart ?? 'Start speaking'}
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          disabled={props.disabled || (!listening && !paused)}
          onClick={pauseOrResume}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <span
          className={`badge ${listening ? 'badge-ok' : paused ? 'badge-warn' : 'badge-neutral'}`}
          aria-live="polite"
        >
          {listening ? 'Recording' : paused ? 'Paused' : 'Mic idle'}
        </span>
      </div>
      {interim && (
        <span className="muted">
          Hearing: “{interim}” — confirm before it is saved. Uncertain transcriptions are never auto-verified.
        </span>
      )}
      {permError && (
        <p className="iv-error" role="alert">
          {permError}
        </p>
      )}
      <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
        Optional. Uses your browser’s speech service when available. Sensitive IDs are never read aloud by default —
        confirm names and amounts before saving.
      </p>
    </div>
  )
}
