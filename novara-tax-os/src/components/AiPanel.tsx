import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { actions, useAppStore } from '../store/useAppStore'
import './AiPanel.css'

export function AiPanel({ compact = false }: { compact?: boolean }) {
  const { messages } = useAppStore()
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    actions.askAi(text.trim())
    setText('')
  }

  return (
    <section className={`ai-panel panel ${compact ? 'compact' : ''}`}>
      <header>
        <div>
          <p className="eyebrow">Personal Tax AI</p>
          <h2>Ask anything about your authorized return</h2>
        </div>
        <span className="badge">Permission-aware</span>
      </header>
      <div className="ai-thread" role="log" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            <p>{m.text}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="ai-suggestions">
        {['Where is my refund?', 'What documents are missing?', 'Can I file now?', 'Business return pricing'].map((s) => (
          <button key={s} type="button" className="chip" onClick={() => actions.askAi(s)}>
            {s}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="ai-form">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask your Tax AI…"
          aria-label="Message Tax AI"
        />
        <button className="btn btn-primary" type="submit">
          Send
        </button>
      </form>
      <p className="ai-disclaimer muted">
        AI extracts, explains, and proposes. Deterministic tax rules remain authoritative. AI cannot transmit or invent evidence.
      </p>
    </section>
  )
}
