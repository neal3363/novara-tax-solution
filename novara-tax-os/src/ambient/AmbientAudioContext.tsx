import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_AMBIENT,
  clampVol,
  loadAmbientPrefs,
  saveAmbientPrefs,
  type AmbientPrefs,
} from './ambientStorage'

/** Mixkit Free License — see /media/ATTRIBUTION.txt */
export const AMBIENT_TRACK_SRC = '/media/novara-lounge-soul-jazz.mp3'
export const AMBIENT_TRACK_LABEL = 'Soul Jazz — Francisco Alvear (Mixkit Free License)'

type AmbientApi = {
  prefs: AmbientPrefs
  /** True after a user gesture started (or resumed) playback */
  playbackStarted: boolean
  /** Effective audible volume after ducking / mute */
  effectiveVolume: number
  isSpeakingDucked: boolean
  isMicPaused: boolean
  enterAndPlay: () => void
  setEnabled: (on: boolean) => void
  setMuted: (muted: boolean) => void
  toggleMute: () => void
  setVolume: (v: number) => void
  /** Call while NOVARA TTS is speaking */
  setVoiceSpeaking: (speaking: boolean) => void
  /** Call while taxpayer mic is active */
  setMicActive: (active: boolean) => void
}

const AmbientCtx = createContext<AmbientApi | null>(null)

const DUCK_LEVEL = 0.06
const FADE_MS = 700

export function AmbientAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [prefs, setPrefs] = useState<AmbientPrefs>(() =>
    typeof window === 'undefined' ? DEFAULT_AMBIENT : loadAmbientPrefs(),
  )
  const [playbackStarted, setPlaybackStarted] = useState(false)
  const [voiceSpeaking, setVoiceSpeaking] = useState(false)
  const [micActive, setMicActive] = useState(false)
  const fadeRef = useRef<number | null>(null)
  const targetVolRef = useRef(0)

  const persist = useCallback((next: AmbientPrefs) => {
    setPrefs(next)
    saveAmbientPrefs(next)
  }, [])

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio(AMBIENT_TRACK_SRC)
      a.loop = true
      a.preload = 'metadata'
      a.volume = 0
      audioRef.current = a
    }
    return audioRef.current
  }, [])

  const computeTarget = useCallback(
    (p: AmbientPrefs, speaking: boolean, mic: boolean) => {
      if (!p.enabled || p.muted || mic) return 0
      if (speaking) return Math.min(p.volume, DUCK_LEVEL)
      return p.volume
    },
    [],
  )

  const fadeTo = useCallback((target: number) => {
    const a = audioRef.current
    if (!a) return
    targetVolRef.current = target
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current)
    const start = a.volume
    const delta = target - start
    if (Math.abs(delta) < 0.01) {
      a.volume = clampVol(target)
      return
    }
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / FADE_MS)
      a.volume = clampVol(start + delta * t)
      if (t < 1 && Math.abs(a.volume - targetVolRef.current) > 0.005) {
        fadeRef.current = requestAnimationFrame(step)
      } else {
        a.volume = clampVol(targetVolRef.current)
        fadeRef.current = null
      }
    }
    fadeRef.current = requestAnimationFrame(step)
  }, [])

  const applyPlayback = useCallback(
    async (p: AmbientPrefs, speaking: boolean, mic: boolean, forceStart: boolean) => {
      const a = ensureAudio()
      const target = computeTarget(p, speaking, mic)
      if (!p.enabled) {
        fadeTo(0)
        try {
          a.pause()
        } catch {
          /* ignore */
        }
        return
      }
      if (forceStart || playbackStarted || p.enabled) {
        try {
          if (a.paused && target > 0) {
            await a.play()
            setPlaybackStarted(true)
          } else if (a.paused && forceStart) {
            await a.play()
            setPlaybackStarted(true)
          }
        } catch {
          // Browser blocked autoplay — wait for another gesture
          setPlaybackStarted(false)
        }
      }
      if (mic) {
        try {
          a.pause()
        } catch {
          /* ignore */
        }
        a.volume = 0
        return
      }
      if (a.paused && target > 0 && playbackStarted) {
        try {
          await a.play()
        } catch {
          /* ignore */
        }
      }
      fadeTo(target)
    },
    [computeTarget, ensureAudio, fadeTo, playbackStarted],
  )

  useEffect(() => {
    void applyPlayback(prefs, voiceSpeaking, micActive, false)
  }, [prefs, voiceSpeaking, micActive, applyPlayback])

  useEffect(() => {
    const onVis = () => {
      const a = audioRef.current
      if (!a) return
      if (document.hidden) {
        try {
          a.pause()
        } catch {
          /* ignore */
        }
      } else if (prefs.enabled && !prefs.muted && !micActive && playbackStarted) {
        void applyPlayback(prefs, voiceSpeaking, false, false)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [applyPlayback, micActive, playbackStarted, prefs, voiceSpeaking])

  useEffect(() => {
    return () => {
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current)
      const a = audioRef.current
      if (a) {
        try {
          a.pause()
        } catch {
          /* ignore */
        }
        audioRef.current = null
      }
    }
  }, [])

  const enterAndPlay = useCallback(() => {
    const next = { ...prefs, enabled: true }
    persist(next)
    void applyPlayback(next, voiceSpeaking, micActive, true)
  }, [applyPlayback, micActive, persist, prefs, voiceSpeaking])

  const api = useMemo<AmbientApi>(
    () => ({
      prefs,
      playbackStarted,
      effectiveVolume: computeTarget(prefs, voiceSpeaking, micActive),
      isSpeakingDucked: voiceSpeaking && prefs.enabled && !prefs.muted,
      isMicPaused: micActive && prefs.enabled,
      enterAndPlay,
      setEnabled: (on) => {
        const next = { ...prefs, enabled: on }
        persist(next)
        if (on) void applyPlayback(next, voiceSpeaking, micActive, true)
      },
      setMuted: (muted) => persist({ ...prefs, muted }),
      toggleMute: () => persist({ ...prefs, muted: !prefs.muted }),
      setVolume: (v) => persist({ ...prefs, volume: clampVol(v) }),
      setVoiceSpeaking,
      setMicActive,
    }),
    [applyPlayback, computeTarget, enterAndPlay, micActive, persist, playbackStarted, prefs, voiceSpeaking],
  )

  return <AmbientCtx.Provider value={api}>{children}</AmbientCtx.Provider>
}

export function useAmbientAudio() {
  const ctx = useContext(AmbientCtx)
  if (!ctx) throw new Error('useAmbientAudio requires AmbientAudioProvider')
  return ctx
}

/** Safe hook when provider may be absent in isolated tests */
export function useAmbientAudioOptional() {
  return useContext(AmbientCtx)
}
