import { useEffect, useId, useRef, useState } from 'react'
import './InterviewChoice.css'

export type InterviewChoiceKind = 'yesno' | 'choice' | 'number' | 'text' | 'date'

export type InterviewChoiceProps = {
  questionId: string
  prompt: string
  choices?: string[]
  kind?: InterviewChoiceKind
  /** Already-confirmed display value (from history), if reopening */
  initialSelected?: string | null
  saving?: boolean
  secondaryLabel?: string
  onSecondary?: () => void
  /** Called only when Answer is pressed after a valid value */
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
  return s
}

function isIsoDate(raw: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
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
  const inputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<string | null>(initialSelected)
  const [amount, setAmount] = useState(initialSelected && kind === 'number' ? String(initialSelected) : '')
  const [textValue, setTextValue] = useState(
    initialSelected && (kind === 'text' || kind === 'date') ? String(initialSelected) : '',
  )
  const [locked, setLocked] = useState(Boolean(initialSelected))
  const [localSaving, setLocalSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  const isSaving = saving || localSaving
  const isFreeText = kind === 'text' || kind === 'date'

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
    setTextValue(initialSelected && (kind === 'text' || kind === 'date') ? String(initialSelected) : '')
    setLocked(Boolean(initialSelected))
    setError(null)
    submitting.current = false
    setLocalSaving(false)
    if (kind === 'text' || kind === 'date') {
      // iPad Safari: focus the field so the keyboard opens when the question appears
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [questionId, initialSelected, kind])

  function pick(choice: string) {
    if (isSaving || locked || submitting.current) return
    setError(null)
    setSelected(choice)
  }

  function changeAnswer() {
    if (isSaving || submitting.current) return
    setLocked(false)
    setError(null)
  }

  function validate(): { ok: true; value: string | number } | { ok: false; message: string } {
    if (kind === 'number') {
      const n = Number(String(amount).replace(/[,$]/g, ''))
      if (!Number.isFinite(n) || n < 0) return { ok: false, message: 'Enter a valid amount (0 or greater).' }
      return { ok: true, value: n }
    }
    if (isFreeText) {
      const raw = textValue.trim()
      if (!raw) {
        return {
          ok: false,
          message:
            kind === 'date'
              ? 'Enter the date of birth as YYYY-MM-DD before answering.'
              : 'Enter the full legal name before answering.',
        }
      }
      if (kind === 'date') {
        if (!isIsoDate(raw)) {
          return { ok: false, message: 'Use date format YYYY-MM-DD (for example 2016-03-15).' }
        }
        return { ok: true, value: raw }
      }
      if (raw.length < 2) {
        return { ok: false, message: 'Enter the dependent’s full legal name (at least 2 characters).' }
      }
      return { ok: true, value: raw }
    }
    if (selected && selected.trim() !== '') return { ok: true, value: selected }
    return { ok: false, message: 'Select an answer before continuing.' }
  }

  async function continueAnswer() {
    if (submitting.current || isSaving || locked) return

    const result = validate()
    if (!result.ok) {
      setError(result.message)
      inputRef.current?.focus()
      return
    }

    const value = result.value
    if (kind === 'number') setSelected(String(value))
    else if (isFreeText) setSelected(String(value))

    submitting.current = true
    setLocalSaving(true)
    setLocked(true)
    setError(null)
    try {
      await Promise.resolve(onConfirm(value))
      // Brief settle so double-taps during sync store updates are ignored
      await new Promise((r) => setTimeout(r, 180))
    } catch (err) {
      setLocked(false)
      setError(err instanceof Error ? err.message : 'Could not save that answer. Try again.')
    } finally {
      submitting.current = false
      setLocalSaving(false)
    }
  }

  const canContinue =
    !isSaving &&
    !locked &&
    (kind === 'number'
      ? amount.trim() !== '' && Number.isFinite(Number(String(amount).replace(/[,$]/g, '')))
      : isFreeText
        ? textValue.trim() !== ''
        : Boolean(selected))

  const shownAnswer = kind === 'number' && amount.trim() ? amount : isFreeText && textValue.trim() ? textValue : selected

  return (
    <div className="iv-choice" role="group" aria-labelledby={labelId} data-question-id={questionId}>
      <p className="iv-choice-prompt" id={labelId}>
        {prompt}
      </p>

      {kind === 'number' ? (
        <div className="iv-amount-row">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            aria-label="Amount in USD"
            placeholder="Enter amount"
            value={amount}
            disabled={locked || isSaving}
            onChange={(e) => {
              if (locked || isSaving) return
              setError(null)
              setAmount(e.target.value)
              setSelected(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void continueAnswer()
              }
            }}
          />
        </div>
      ) : isFreeText ? (
        <div className="iv-amount-row">
          <input
            ref={inputRef}
            type={kind === 'date' ? 'text' : 'text'}
            inputMode={kind === 'date' ? 'numeric' : 'text'}
            autoComplete={kind === 'date' ? 'bday' : 'name'}
            autoCapitalize={kind === 'date' ? 'off' : 'words'}
            enterKeyHint="done"
            aria-label={kind === 'date' ? 'Date of birth YYYY-MM-DD' : 'Full legal name'}
            placeholder={kind === 'date' ? 'YYYY-MM-DD' : 'Full legal name'}
            value={textValue}
            disabled={locked || isSaving}
            onChange={(e) => {
              if (locked || isSaving) return
              setError(null)
              setTextValue(e.target.value)
              setSelected(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void continueAnswer()
              }
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

      {error && (
        <p className="iv-error" role="alert">
          {error}
        </p>
      )}

      {shownAnswer != null && String(shownAnswer).trim() !== '' && !error && (
        <p className="iv-confirm-line" aria-live="polite">
          Your answer: <span>{displayAnswer(shownAnswer)}</span>
          {locked ? ' ✓' : ''}
        </p>
      )}

      <div className="iv-actions">
        {!locked && (
          <button className="btn btn-primary" type="button" disabled={!canContinue} onClick={() => void continueAnswer()}>
            {isSaving ? 'Saving…' : 'Answer'}
          </button>
        )}
        {(selected || amount || textValue) && (
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
          <div className="iv-history-item iv-history-answered" key={item.id}>
            <p className="iv-history-q">
              <span className="iv-status-pill iv-status-green" title="Answered">
                ✓ Answered
              </span>{' '}
              Question: {item.prompt}
            </p>
            <p className="iv-history-a">
              <span>
                Your answer: <strong>{displayAnswer(item.answer)}</strong>
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
