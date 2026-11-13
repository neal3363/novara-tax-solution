import { useAmbientAudioOptional } from '../ambient/AmbientAudioContext'
import './MusicControls.css'

/** Persistent mute / volume / on-off — keyboard and touch friendly */
export function MusicControls(props: { compact?: boolean; className?: string }) {
  const ambient = useAmbientAudioOptional()
  if (!ambient) return null

  const { prefs, setEnabled, toggleMute, setVolume, isSpeakingDucked, isMicPaused, playbackStarted } = ambient
  const status = !prefs.enabled
    ? 'Music off'
    : prefs.muted
      ? 'Muted'
      : isMicPaused
        ? 'Paused for mic'
        : isSpeakingDucked
          ? 'Ducked for voice'
          : playbackStarted
            ? 'Playing'
            : 'Ready'

  return (
    <div
      className={`music-controls ${props.compact ? 'compact' : ''} ${props.className ?? ''}`}
      role="group"
      aria-label="Background music controls"
    >
      <button
        type="button"
        className="music-btn"
        aria-pressed={prefs.enabled}
        aria-label={prefs.enabled ? 'Turn background music off' : 'Turn background music on'}
        onClick={() => setEnabled(!prefs.enabled)}
      >
        {prefs.enabled ? 'Music on' : 'Music off'}
      </button>
      <button
        type="button"
        className="music-btn"
        disabled={!prefs.enabled}
        aria-pressed={prefs.muted}
        aria-label={prefs.muted ? 'Unmute background music' : 'Mute background music'}
        onClick={toggleMute}
      >
        {prefs.muted ? 'Unmute' : 'Mute'}
      </button>
      <label className="music-vol">
        <span className="sr-only">Volume</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(prefs.volume * 100)}
          disabled={!prefs.enabled || prefs.muted}
          aria-valuetext={`${Math.round(prefs.volume * 100)} percent`}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
        />
      </label>
      <span className="music-status" aria-live="polite">
        {status}
      </span>
    </div>
  )
}
