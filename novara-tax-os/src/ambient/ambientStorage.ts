const KEY = 'novara-ambient-prefs-v1'

export type AmbientPrefs = {
  /** User enabled music after Enter / interaction */
  enabled: boolean
  /** Soft mute without disabling the feature */
  muted: boolean
  /** 0–1 user volume (default gentle) */
  volume: number
}

export const DEFAULT_AMBIENT: AmbientPrefs = {
  enabled: false,
  muted: false,
  volume: 0.22,
}

export function loadAmbientPrefs(): AmbientPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_AMBIENT }
    const parsed = JSON.parse(raw) as Partial<AmbientPrefs>
    return {
      enabled: Boolean(parsed.enabled),
      muted: Boolean(parsed.muted),
      volume: clampVol(typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_AMBIENT.volume),
    }
  } catch {
    return { ...DEFAULT_AMBIENT }
  }
}

export function saveAmbientPrefs(prefs: AmbientPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* private mode */
  }
}

export function clampVol(n: number) {
  if (!Number.isFinite(n)) return DEFAULT_AMBIENT.volume
  return Math.min(1, Math.max(0, n))
}
