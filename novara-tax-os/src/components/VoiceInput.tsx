import { useEffect, useRef, useState } from 'react'

type SpeechRec = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
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

export function VoiceInput(props: {
  onTranscript: (text: string, meta: { confidence: 'high' | 'low' }) => void
  disabled?: boolean
}) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recRef = useRef<SpeechRec | null>(null)
  const supported =
    typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

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
        // Browser STT does not expose reliable confidence — treat as low until user confirms
        props.onTranscript(finalText.trim(), { confidence: 'low' })
      }
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec
    return () => {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    }
  }, [props])

  function toggle() {
    if (!recRef.current || props.disabled) return
    if (listening) {
      recRef.current.stop()
      setListening(false)
      return
    }
    setInterim('')
    recRef.current.start()
    setListening(true)
  }

  if (!supported) {
    return <p className="muted">Voice input is not supported in this browser. Type your answer instead.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <button className={`btn ${listening ? 'btn-primary' : 'btn-secondary'}`} type="button" disabled={props.disabled} onClick={toggle}>
        {listening ? 'Stop listening' : 'Speak answer'}
      </button>
      {interim && (
        <span className="muted">
          Hearing: “{interim}” — confirm before it is saved (uncertain transcriptions are never auto-verified).
        </span>
      )}
    </div>
  )
}
