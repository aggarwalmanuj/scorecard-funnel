"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Play } from "lucide-react"
import posthog from "posthog-js"

/**
 * Orientation video for the path-selection step — optional and
 * non-blocking by design: this page is the funnel's worst drop-off point,
 * so the video must never gate the path cards or the CTA.
 *
 * Tap-to-play (no autoplay): the poster + play affordance cost ~40KB;
 * the 8MB MP4 downloads only after an explicit tap (`preload="metadata"`).
 * Captions are burned into the footage, so muted viewing still lands.
 *
 * PostHog events (all fired at most once per mount):
 *   orientation_video_play      — user started the video
 *   orientation_video_midpoint  — reached 50%
 *   orientation_video_complete  — reached the end
 * Compare signup→question-1 conversion for watchers vs non-watchers to
 * decide whether this earns its place.
 */
export function OrientationVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  const firedRef = useRef({ play: false, midpoint: false, complete: false })

  const capture = (event: string) => {
    try {
      posthog.capture(event)
    } catch {
      /* posthog not initialized (dev without token) */
    }
  }

  const handleStart = () => {
    setStarted(true)
    if (!firedRef.current.play) {
      firedRef.current.play = true
      capture("orientation_video_play")
    }
    // Play after the overlay unmounts so the tap lands as a user gesture.
    requestAnimationFrame(() => {
      void videoRef.current?.play().catch(() => {})
    })
  }

  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (!v || !v.duration) return
    if (!firedRef.current.midpoint && v.currentTime / v.duration >= 0.5) {
      firedRef.current.midpoint = true
      capture("orientation_video_midpoint")
    }
  }

  const handleEnded = () => {
    if (!firedRef.current.complete) {
      firedRef.current.complete = true
      capture("orientation_video_complete")
    }
  }

  return (
    <figure className="mx-auto mb-10 max-w-2xl animate-fade-in-up">
      <div className="relative overflow-hidden rounded-md border border-border bg-card shadow-[0_18px_50px_-35px_rgba(var(--shadow-ink),0.4)]">
        <div className="relative aspect-video w-full">
          <video
            ref={videoRef}
            src="/videos/funnel-orientation-720p.mp4"
            poster="/videos/funnel-orientation-poster.webp"
            preload="none"
            playsInline
            controls={started}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {!started && (
            <button
              type="button"
              onClick={handleStart}
              aria-label="Play the one-minute orientation video"
              className="group absolute inset-0 flex items-center justify-center"
            >
              {/* Poster is the video's own first frame via the poster attr;
                  this Image is a no-JS-visible duplicate kept for instant
                  paint before the video element initialises. */}
              <Image
                src="/videos/funnel-orientation-poster.webp"
                alt="Founder introducing the Belief Score assessment"
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover"
                priority={false}
              />
              <span className="absolute inset-0 bg-ink/20 transition-colors duration-500 group-hover:bg-ink/10" />
              <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-background/95 text-ink shadow-[0_14px_40px_-12px_rgba(var(--shadow-ink),0.6)] transition-transform duration-500 group-hover:scale-105 group-active:scale-95">
                <Play className="ml-0.5 h-6 w-6 fill-current" strokeWidth={0} />
              </span>
            </button>
          )}
        </div>
      </div>
      <figcaption className="mt-3 flex items-center justify-center gap-3">
        <span className="h-px w-8 bg-foreground/40" aria-hidden />
        <span className="eyebrow text-foreground/65">
          One minute from the founder · optional
        </span>
        <span className="h-px w-8 bg-foreground/40" aria-hidden />
      </figcaption>
    </figure>
  )
}
