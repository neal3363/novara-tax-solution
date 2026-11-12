import { useEffect, useId, useRef, useState } from 'react'
import './InterviewChoice.css'

export type InterviewChoiceProps = {
  questionId: string
  prompt: string
  choices?: string[]
  kind?: 'yesno' | 'choice' | 'number' | 'text'
  /** Already-confirmed display value (from history), if reopening */
  initialSelected?: string | null
  saving?: boolean
  secondaryLabel?: string
  onSecondary?: () => void
  /** Called only when Continue is pressed after a clear selection */
  onConfirm: (value: string | number) => void | Promise<void>
}

function normalizeLabel(choice: string) {
  return choice.trim()
}

function displayAnswer(value: string | number) {
  const s = String(value)
  if (s.toLowerCase() === 'yes') return 'YES'
  if (s.toLowerCase() === 'no') return 'NO'
  if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s)
    if (!Number.isNaN(n)) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
    }
  }
  return s.toUpperCase()
}

export function InterviewChoice({
  questionId,
  prompt,
  choices,
  kind = 'choice',
  initialSelected = null,
  saving = false,
  secondaryLabel,
  onSecondary,
  onConfirm,
}: InterviewChoiceProps) {
  const labelId = useId()
  const [selected, setSelected] = useState<string | null>(initialSelected)
  const [amount, setAmount] = useState(initialSelected && kind === 'number' ? String(initialSelected) : '')
  const [locked, setLocked] = useState(Boolean(initialSelected))
  const [localSaving, setLocalSaving] = useState(false)
  const submitting = useRef(false)
  const isSaving = saving || localSaving

  const options =
    choices && choices.length > 0
      ? choices.map(normalizeLabel)
      : kind === 'yesno'
        ? ['Yes', 'No']
        : []

  const isBinaryYesNo =
    options.length === 2 &&
    options[0].toLowerCase() === 'yes' &&
    options[1].toLowerCase() === 'no'

  useEffect(() => {
    // Reset local draft when the active question changes
    setSelected(initialSelected)
    setAmount(initialSelected && kind === 'number' ? String(initialSelected) : '')
    setLocked(Boolean(initialSelected))
    submitting.current = false
    setLocalSaving(false)
  }, [questionId, initialSelected, kind])

  function pick(choice: string) {
    if (isSaving || locked || submitting.current) return
    setSelected(choice)
  }

  function changeAnswer() {
    if (isSaving || submitting.current) return
    setLocked(false)
    // Keep current selection visible so the taxpayer sees what they are changing
  }

  async function continueAnswer() {
    if (submitting.current || isSaving || locked) return

    let value: string | number | null = null
    if (kind === 'number') {
      const n = Number(String(amount).replace(/[,$]/g, ''))
      if (!Number.isFinite(n) || n < 0) return
      value = n
      setSelected(String(n))
    } else if (selected) {
      value = selected
    }
    if (value == null || value === '') return

    submitting.current = true
    setLocalSaving(true)
    setLocked(true)
    try {
      await Promise.resolve(onConfirm(value))
      // Brief settle so double-taps during sync store updates are ignored
      await new Promise((r) => setTimeout(r, 180))
    } finally {
      submitting.current = false
      setLocalSaving(false)
    }
  }

  const canContinue =
    !isSaving &&
    !locked &&
    (kind === 'number' ? amount.trim() !== '' && Number.isFinite(Number(String(amount).replace(/[,$]/g, ''))) : Boolean(selected))

  const shownAnswer = kind === 'number' && amount.trim() ? amount : selected

  return (
    <div className="iv-choice" role="group" aria-labelledby={labelId} data-question-id={questionId}>
      <p className="iv-choice-prompt" id={labelId}>
        {prompt}
      </p>

      {kind === 'number' ? (
        <div className="iv-amount-row">
          <input
            type="text"
            inputMode="decimal"
            aria-label="Amount in USD"
            placeholder="Enter amount"
            value={amount}
            disabled={locked || isSaving}
            onChange={(e) => {
              if (locked || isSaving) return
              setAmount(e.target.value)
              setSelected(e.target.value)
            }}
          />
        </div>
      ) : (
        <div className={`iv-choice-options ${isBinaryYesNo ? '' : 'multi'}`}>
          {options.map((c) => {
            const isSelected = selected === c
            return (
              <button
                key={c}
                type="button"
                className={`iv-option ${isSelected ? 'selected' : ''} ${locked || isSaving ? 'locked' : ''}`}
                aria-pressed={isSelected}
                disabled={isSaving || (locked && !isSelected)}
                onClick={() => pick(c)}
              >
                {isSelected && (
                  <span className="iv-check" aria-hidden>
                    ✓
                  </span>
                )}
                <span>{c}</span>
              </button>
            )
          })}
        </div>
      )}

      {shownAnswer != null && String(shownAnswer).trim() !== '' && (
        <p className="iv-confirm-line" aria-live="polite">
          Your answer: <span>{displayAnswer(shownAnswer)}</span>
          {locked ? ' ✓' : ''}
        </p>
      )}

      <div className="iv-actions">
        {!locked && (
          <button className="btn btn-primary" type="button" disabled={!canContinue} onClick={() => void continueAnswer()}>
            {isSaving ? 'Saving…' : 'Continue'}
          </button>
        )}
        {(selected || amount) && (
          <button className="btn btn-secondary" type="button" disabled={isSaving} onClick={changeAnswer}>
            Change Answer
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button className="btn btn-ghost" type="button" disabled={isSaving || locked} onClick={onSecondary}>
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export type AnswerHistoryItem = {
  id: string
  mapsTo: string
  prompt: string
  answer: string | number
}

export function AnswerHistory({
  items,
  onEdit,
}: {
  items: AnswerHistoryItem[]
  onEdit: (mapsTo: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="iv-history">
      <h3>Your confirmed answers</h3>
      <div className="iv-history-list">
        {items.map((item) => (
          <div className="iv-history-item" key={item.id}>
            <p className="iv-history-q">Question: {item.prompt}</p>
            <p className="iv-history-a">
              <span>
                Your answer: <strong>{displayAnswer(item.answer)} ✓</strong>
              </span>
              <button type="button" className="iv-history-edit" onClick={() => onEdit(item.mapsTo)}>
                Change Answer
              </button>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
