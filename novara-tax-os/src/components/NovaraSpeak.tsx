import { useEffect, useRef, useState } from 'react'
import { useAmbientAudioOptional } from '../ambient/AmbientAudioContext'

/** Browser TTS for NOVARA questions — optional; never auto-starts without user unmute. */
export function NovaraSpeak(props: {
  text: string
  enabled: boolean
  rate?: number
}) {
  const [speaking, setSpeaking] = useState(false)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  const ambient = useAmbientAudioOptional()
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel()
      } catch {
        /* ignore */
      }
      ambient?.setVoiceSpeaking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup only
  }, [])

  useEffect(() => {
    ambient?.setVoiceSpeaking(speaking)
  }, [ambient, speaking])

  useEffect(() => {
    if (!props.enabled || !supported || !props.text.trim()) return
    // Do not auto-speak on every text change — only when Repeat is used or caller triggers speak()
  }, [props.enabled, props.text, supported])

  function speak() {
    if (!supported || !props.enabled) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(props.text)
    u.rate = props.rate ?? 1
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    utterRef.current = u
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }

  function stop() {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }

  if (!supported) return null

  return (
    <div className="novara-speak" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
      <button className="btn btn-ghost" type="button" disabled={!props.enabled || !props.text} onClick={speak}>
        {speaking ? 'Speaking…' : 'Repeat aloud'}
      </button>
      <button className="btn btn-ghost" type="button" disabled={!speaking} onClick={stop}>
        Stop voice
      </button>
    </div>
  )
}
