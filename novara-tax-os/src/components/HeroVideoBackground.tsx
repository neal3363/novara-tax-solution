import { useEffect, useRef, useState } from 'react'
import './HeroVideoBackground.css'

/** 12s Mixkit-licensed cinematic reel (luxury buildings → deals → advisor/client → preparer team). */
const DESKTOP_WEBM = '/media/novara-cinematic-hero.webm'
const DESKTOP_MP4 = '/media/novara-cinematic-hero.mp4'
const MOBILE_WEBM = '/media/novara-cinematic-hero-mobile.webm'
const MOBILE_MP4 = '/media/novara-cinematic-hero-mobile.mp4'
const POSTER = '/media/novara-cinematic-poster.jpg'
const POSTER_FALLBACK = '/media/novara-office-poster.jpg'

/** Swap before EOF so the next buffer is already decoding — avoids native `loop` stall. */
const LOOP_SWAP_SECONDS = 0.28

function armVideo(v: HTMLVideoElement) {
  v.muted = true
  v.defaultMuted = true
  v.setAttribute('muted', '')
  v.playsInline = true
  v.setAttribute('playsinline', '')
  v.setAttribute('webkit-playsinline', '')
}

function tryPlay(v: HTMLVideoElement) {
  armVideo(v)
  void v.play().catch(() => {
    /* Keep visible; retry on gesture / visibility. */
  })
}

/**
 * Full-bleed silent cinematic business/tax-office video — continuous 12s loop.
 * Dual buffers flip before the last frame so the reel never freezes on the final clip.
 * Respects prefers-reduced-motion. Never permanently swaps to a still after a
 * transient autoplay/abort error — only reduced-motion uses the poster image.
 */
export function HeroVideoBackground() {
  const aRef = useRef<HTMLVideoElement>(null)
  const bRef = useRef<HTMLVideoElement>(null)
  const activeRef = useRef<0 | 1>(0)
  const swappingRef = useRef(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [useMobile, setUseMobile] = useState(false)
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0)

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
    const a = aRef.current
    const b = bRef.current
    if (!a || !b) return

    const buffers: [HTMLVideoElement, HTMLVideoElement] = [a, b]
    activeRef.current = 0
    swappingRef.current = false
    setActiveSlot(0)

    for (const v of buffers) {
      armVideo(v)
      v.loop = false
      v.preload = 'auto'
      try {
        v.load()
      } catch {
        /* ignore */
      }
    }

    const idle = () => buffers[activeRef.current === 0 ? 1 : 0]
    const active = () => buffers[activeRef.current]

    const swap = () => {
      if (swappingRef.current) return
      const cur = active()
      const next = idle()
      if (!Number.isFinite(cur.duration) || cur.duration <= 0) return
      swappingRef.current = true

      next.pause()
      try {
        next.currentTime = 0
      } catch {
        /* ignore seek errors */
      }
      tryPlay(next)

      const nextSlot: 0 | 1 = activeRef.current === 0 ? 1 : 0
      activeRef.current = nextSlot
      setActiveSlot(nextSlot)

      // Reset the previous buffer after the swap paints.
      window.setTimeout(() => {
        cur.pause()
        try {
          cur.currentTime = 0
        } catch {
          /* ignore */
        }
        swappingRef.current = false
      }, 80)
    }

    const onTimeUpdate = (ev: Event) => {
      const v = ev.currentTarget as HTMLVideoElement
      if (v !== active()) return
      const dur = v.duration
      if (!Number.isFinite(dur) || dur <= 0) return
      if (dur - v.currentTime <= LOOP_SWAP_SECONDS) swap()
    }

    const onEnded = (ev: Event) => {
      const v = ev.currentTarget as HTMLVideoElement
      if (v !== active()) return
      swap()
    }

    const kick = () => {
      tryPlay(active())
      // Warm the idle buffer at t=0 so the next swap starts immediately.
      const next = idle()
      next.pause()
      try {
        next.currentTime = 0
      } catch {
        /* ignore */
      }
    }

    const onCanPlay = () => kick()

    for (const v of buffers) {
      v.addEventListener('timeupdate', onTimeUpdate)
      v.addEventListener('ended', onEnded)
    }
    // Prime once the first buffer can decode — avoid re-kicking on every canplay.
    a.addEventListener('canplay', onCanPlay, { once: true })
    if (a.readyState >= 2) kick()

    const onVis = () => {
      if (!document.hidden) kick()
    }
    const onGesture = () => kick()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pointerdown', onGesture, { once: true, passive: true })
    window.addEventListener('keydown', onGesture, { once: true })

    return () => {
      for (const v of buffers) {
        v.removeEventListener('timeupdate', onTimeUpdate)
        v.removeEventListener('ended', onEnded)
        v.pause()
      }
      a.removeEventListener('canplay', onCanPlay)
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
      data-hero-loop="seamless-dual"
    >
      {showVideo ? (
        <>
          <video
            key={`a-${useMobile ? 'm' : 'd'}`}
            ref={aRef}
            className={`hero-video-el${activeSlot === 0 ? ' is-active' : ' is-idle'}`}
            autoPlay
            muted
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
          <video
            key={`b-${useMobile ? 'm' : 'd'}`}
            ref={bRef}
            className={`hero-video-el${activeSlot === 1 ? ' is-active' : ' is-idle'}`}
            muted
            playsInline
            preload="auto"
            poster={POSTER}
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            tabIndex={-1}
          >
            <source src={webm} type="video/webm" />
            <source src={mp4} type="video/mp4" />
          </video>
        </>
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
