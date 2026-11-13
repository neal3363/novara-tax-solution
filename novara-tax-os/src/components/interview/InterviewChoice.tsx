import { useEffect, useId, useRef, useState } from 'react'
import './InterviewChoice.css'

export type InterviewChoiceKind = 'yesno' | 'choice' | 'number' | 'text' | 'date'

export type InterviewChoiceProps = {
  questionId: string
  prompt: string
  /** Optional mapsTo — used to force a text field for dep_*_name / dob even if kind is wrong */
  mapsTo?: string
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

function displayAnswer(value: string | number, asMoney = false) {
  const s = String(value)
  if (s.toLowerCase() === 'yes') return 'YES'
  if (s.toLowerCase() === 'no') return 'NO'
  if (asMoney && (typeof value === 'number' || /^\d+(\.\d+)?$/.test(s))) {
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

/** Force free-text UI when the question is clearly a typed fact (name / DOB / TIN last4). */
function detectFreeText(
  kind: InterviewChoiceKind,
  mapsTo: string | undefined,
  prompt: string,
): { freeText: boolean; mode: 'text' | 'date' } {
  const key = (mapsTo || '').toLowerCase()
  const p = prompt.toLowerCase()
  if (kind === 'date' || key.endsWith('_dob') || p.includes('date of birth') || p.includes('yyyy-mm-dd')) {
    return { freeText: true, mode: 'date' }
  }
  if (
    kind === 'text' ||
    key.endsWith('_name') ||
    key.endsWith('_tin_last4') ||
    p.includes('full legal name') ||
    p.includes('last 4')
  ) {
    return { freeText: true, mode: 'text' }
  }
  return { freeText: false, mode: 'text' }
}

export function InterviewChoice({
  questionId,
  prompt,
  mapsTo,
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
  const detected = detectFreeText(kind, mapsTo, prompt)
  const isFreeText = detected.freeText
  const textMode = detected.mode

  const [selected, setSelected] = useState<string | null>(initialSelected)
  const [amount, setAmount] = useState(initialSelected && kind === 'number' ? String(initialSelected) : '')
  const [textValue, setTextValue] = useState(initialSelected && isFreeText ? String(initialSelected) : '')
  const [locked, setLocked] = useState(Boolean(initialSelected && String(initialSelected).trim()))
  const [localSaving, setLocalSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  const isSaving = saving || localSaving

  const options =
    !isFreeText && choices && choices.length > 0
      ? choices.map(normalizeLabel)
      : !isFreeText && kind === 'yesno'
        ? ['Yes', 'No']
        : []

  const isBinaryYesNo =
    options.length === 2 &&
    options[0].toLowerCase() === 'yes' &&
    options[1].toLowerCase() === 'no'

  useEffect(() => {
    const free = detectFreeText(kind, mapsTo, prompt).freeText
    setSelected(initialSelected)
    setAmount(initialSelected && kind === 'number' ? String(initialSelected) : '')
    setTextValue(initialSelected && free ? String(initialSelected) : '')
    setLocked(Boolean(initialSelected && String(initialSelected).trim()))
    setError(null)
    submitting.current = false
    setLocalSaving(false)
  }, [questionId, initialSelected, kind, mapsTo, prompt])

  function changeAnswer() {
    if (isSaving || submitting.current) return
    setLocked(false)
    setError(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function validateWith(
    draftSelected: string | null,
    draftAmount: string,
    draftText: string,
  ): { ok: true; value: string | number } | { ok: false; message: string } {
    if (kind === 'number' && !isFreeText) {
      const n = Number(String(draftAmount).replace(/[,$]/g, ''))
      if (!Number.isFinite(n) || n < 0) return { ok: false, message: 'Enter a valid amount (0 or greater).' }
      return { ok: true, value: n }
    }
    if (isFreeText) {
      const raw = draftText.trim()
      if (!raw) {
        return {
          ok: false,
          message:
            textMode === 'date'
              ? 'Enter the date of birth as YYYY-MM-DD before answering.'
              : 'Enter the full legal name before answering.',
        }
      }
      if (textMode === 'date') {
        if (!isIsoDate(raw)) {
          return { ok: false, message: 'Use date format YYYY-MM-DD (for example 2016-03-15).' }
        }
        return { ok: true, value: raw }
      }
      if (mapsTo?.endsWith('_tin_last4')) {
        const digits = raw.replace(/\D/g, '')
        if (digits.length !== 4) return { ok: false, message: 'Enter exactly 4 digits (last 4 only).' }
        return { ok: true, value: digits }
      }
      if (raw.length < 2) {
        return { ok: false, message: 'Enter the dependent’s full legal name (at least 2 characters).' }
      }
      return { ok: true, value: raw }
    }
    if (draftSelected && draftSelected.trim() !== '') return { ok: true, value: draftSelected }
    return { ok: false, message: 'Select an answer before continuing.' }
  }

  async function continueAnswer(overrideSelected?: string) {
    if (submitting.current || isSaving || locked) return

    const draftSelected = overrideSelected ?? selected
    if (overrideSelected) setSelected(overrideSelected)

    const result = validateWith(draftSelected, amount, textValue)
    if (!result.ok) {
      setError(result.message)
      inputRef.current?.focus()
      return
    }

    const value = result.value
    if (kind === 'number' && !isFreeText) setSelected(String(value))
    else if (isFreeText) setSelected(String(value))

    submitting.current = true
    setLocalSaving(true)
    setError(null)
    try {
      await Promise.resolve(onConfirm(value))
      // Keep controls usable if the parent did not remount onto a new question
      // (that used to look like a freeze: locked, no Answer button).
      setLocked(false)
    } catch (err) {
      setLocked(false)
      setError(err instanceof Error ? err.message : 'Could not save that answer. Try again.')
    } finally {
      submitting.current = false
      setLocalSaving(false)
    }
  }

  function pick(choice: string) {
    if (isSaving || locked || submitting.current) return
    setError(null)
    setSelected(choice)
    // Yes/No (and short choice lists): one tap saves and advances — no second Answer tap.
    if (isBinaryYesNo || (options.length > 0 && options.length <= 6 && kind !== 'number' && !isFreeText)) {
      void continueAnswer(choice)
    }
  }

  const canContinue =
    !isSaving &&
    !locked &&
    (isFreeText
      ? textValue.trim() !== ''
      : kind === 'number'
        ? amount.trim() !== '' && Number.isFinite(Number(String(amount).replace(/[,$]/g, '')))
        : Boolean(selected))

  const shownAnswer =
    kind === 'number' && !isFreeText && amount.trim()
      ? amount
      : isFreeText && textValue.trim()
        ? textValue
        : selected

  return (
    <form
      className="iv-choice"
      role="group"
      aria-labelledby={labelId}
      data-question-id={questionId}
      data-maps-to={mapsTo || ''}
      data-kind={isFreeText ? textMode : kind}
      onSubmit={(e) => {
        e.preventDefault()
        void continueAnswer()
      }}
    >
      <p className="iv-choice-prompt" id={labelId}>
        {prompt}
      </p>

      {kind === 'number' && !isFreeText ? (
        <div className="iv-amount-row">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            aria-label="Amount in USD"
            placeholder="Enter amount"
            value={amount}
            readOnly={locked || isSaving}
            onChange={(e) => {
              if (locked || isSaving) return
              setError(null)
              setAmount(e.target.value)
              setSelected(e.target.value)
            }}
          />
        </div>
      ) : isFreeText ? (
        <div className="iv-amount-row">
          <label className="iv-text-label" htmlFor={`iv-text-${questionId}`}>
            {textMode === 'date' ? 'Type the date (YYYY-MM-DD)' : 'Type the full legal name'}
          </label>
          <input
            ref={inputRef}
            id={`iv-text-${questionId}`}
            name={mapsTo || questionId}
            type="text"
            inputMode={textMode === 'date' ? 'numeric' : 'text'}
            autoComplete={textMode === 'date' ? 'bday' : 'name'}
            autoCapitalize={textMode === 'date' ? 'off' : 'words'}
            autoCorrect="off"
            spellCheck={textMode !== 'date'}
            enterKeyHint="done"
            aria-label={textMode === 'date' ? 'Date of birth YYYY-MM-DD' : 'Full legal name'}
            placeholder={textMode === 'date' ? 'YYYY-MM-DD' : 'e.g. Emma Blake'}
            value={textValue}
            readOnly={locked || isSaving}
            onFocus={(e) => {
              if (!locked && textValue) e.currentTarget.select()
            }}
            onChange={(e) => {
              if (locked || isSaving) return
              setError(null)
              setTextValue(e.target.value)
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

      {error && (
        <p className="iv-error" role="alert">
          {error}
        </p>
      )}

      {shownAnswer != null && String(shownAnswer).trim() !== '' && !error && (
        <p className="iv-confirm-line" aria-live="polite">
          Your answer: <span>{displayAnswer(shownAnswer, kind === 'number' && !isFreeText)}</span>
          {isSaving ? ' · Saving…' : locked ? ' ✓' : ''}
        </p>
      )}

      <div className="iv-actions">
        {!locked && (isFreeText || kind === 'number') && (
          <button className="btn btn-primary" type="submit" disabled={!canContinue}>
            {isSaving ? 'Saving…' : 'Answer'}
          </button>
        )}
        {!locked && !isFreeText && kind !== 'number' && !isBinaryYesNo && options.length > 6 && (
          <button className="btn btn-primary" type="submit" disabled={!canContinue}>
            {isSaving ? 'Saving…' : 'Answer'}
          </button>
        )}
        {isSaving && (
          <p className="iv-saving-hint" role="status">
            Saving answer…
          </p>
        )}
        {(selected || amount || textValue || locked) && !isSaving && (
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
      {!isFreeText && kind !== 'number' && isBinaryYesNo && !locked && !isSaving && (
        <p className="iv-tap-hint muted">Tap Yes or No — it saves and moves on automatically.</p>
      )}
    </form>
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
                Your answer: <strong>{displayAnswer(item.answer, false)}</strong>
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
