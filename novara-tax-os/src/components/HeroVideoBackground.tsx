import { useEffect, useRef, useState } from 'react'
import './HeroVideoBackground.css'

/** 12s Mixkit-licensed cinematic reel (HQ → networking → fintech workspace). */
const DESKTOP_WEBM = '/media/novara-cinematic-hero.webm'
const DESKTOP_MP4 = '/media/novara-cinematic-hero.mp4'
const MOBILE_WEBM = '/media/novara-cinematic-hero-mobile.webm'
const MOBILE_MP4 = '/media/novara-cinematic-hero-mobile.mp4'
const POSTER = '/media/novara-cinematic-poster.jpg'
const POSTER_FALLBACK = '/media/novara-office-poster.jpg'

/**
 * Full-bleed silent cinematic headquarters video — 12s loop.
 * WebM (VP9) + H.264 baseline MP4 for broad browser coverage.
 * Respects prefers-reduced-motion. Never permanently swaps to a still after a
 * transient autoplay/abort error — only reduced-motion uses the poster image.
 */
export function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [useMobile, setUseMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const apply = () => setUseMobile(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    const v = videoRef.current
    if (!v) return

    const arm = () => {
      v.muted = true
      v.defaultMuted = true
      v.setAttribute('muted', '')
      v.playsInline = true
      v.setAttribute('playsinline', '')
      v.setAttribute('webkit-playsinline', '')
    }

    const play = () => {
      arm()
      void v.play().catch(() => {
        /* Keep <video> visible; retry on gesture. */
      })
    }

    arm()
    const onCanPlay = () => play()
    if (v.readyState >= 2) play()
    else v.addEventListener('canplay', onCanPlay)

    const onVis = () => {
      if (!document.hidden) play()
    }
    const onGesture = () => play()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pointerdown', onGesture, { once: true, passive: true })
    window.addEventListener('keydown', onGesture, { once: true })
    return () => {
      v.removeEventListener('canplay', onCanPlay)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
    }
  }, [reducedMotion, useMobile])

  const showVideo = !reducedMotion
  const webm = useMobile ? MOBILE_WEBM : DESKTOP_WEBM
  const mp4 = useMobile ? MOBILE_MP4 : DESKTOP_MP4

  return (
    <div
      className="hero-video-bg"
      aria-hidden
      data-hero-video="novara-cinematic-12s"
      data-hero-fallback={showVideo ? 'video' : 'static-poster'}
      data-hero-duration="12"
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
          preload="auto"
          poster={POSTER}
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
        >
          <source src={webm} type="video/webm" />
          <source src={mp4} type="video/mp4" />
        </video>
      ) : (
        <img
          className="hero-video-poster"
          src={POSTER}
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
