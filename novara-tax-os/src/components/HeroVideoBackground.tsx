import { useEffect, useRef, useState } from 'react'
import './HeroVideoBackground.css'

/** 12s Mixkit-licensed cinematic reel (HQ → networking → fintech workspace). */
const DESKTOP_SRC = '/media/novara-cinematic-hero.mp4'
const MOBILE_SRC = '/media/novara-cinematic-hero-mobile.mp4'
const POSTER = '/media/novara-cinematic-poster.jpg'
/** Legacy paths remain as identical encodes for caches / older builds. */
const DESKTOP_FALLBACK = '/media/novara-office-hero.mp4'
const MOBILE_FALLBACK = '/media/novara-office-hero-mobile.mp4'
const POSTER_FALLBACK = '/media/novara-office-poster.jpg'

/**
 * Full-bleed silent cinematic headquarters video — 12s loop.
 * Reduced-motion / failed playback fall back to the static poster.
 */
export function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [failed, setFailed] = useState(false)
  const [useMobile, setUseMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px), (max-height: 520px)')
    const apply = () => setUseMobile(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  useEffect(() => {
    if (reducedMotion || failed) return
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.defaultMuted = true
    v.playsInline = true
    const play = () => {
      void v.play().catch(() => setFailed(true))
    }
    play()
    const onVis = () => {
      if (document.hidden) v.pause()
      else play()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [reducedMotion, failed, useMobile])

  const showVideo = !reducedMotion && !failed
  const poster = POSTER
  const primary = useMobile ? MOBILE_SRC : DESKTOP_SRC
  const secondary = useMobile ? MOBILE_FALLBACK : DESKTOP_FALLBACK

  return (
    <div
      className="hero-video-bg"
      aria-hidden
      data-hero-video="novara-cinematic-12s"
      data-hero-fallback={failed || reducedMotion ? 'static-poster' : 'video'}
    >
      {showVideo ? (
        <video
          key={useMobile ? 'm' : 'd'}
          ref={videoRef}
          className="hero-video-el"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          onError={() => setFailed(true)}
        >
          <source src={primary} type="video/mp4" />
          <source src={secondary} type="video/mp4" />
        </video>
      ) : (
        <img
          className="hero-video-poster"
          src={poster}
          alt=""
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).src = POSTER_FALLBACK
          }}
        />
      )}
      <div className="hero-video-overlay" />
    </div>
  )
}
