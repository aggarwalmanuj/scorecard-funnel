"use client"

import Image from "next/image"
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, ArrowRight, Play, X } from "lucide-react"

type Voice = { src: string; poster: string }

const VOICES: Voice[] = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  return {
    src: `https://bfyvfetxtgsgzjci.public.blob.vercel-storage.com/Clip%20${n}.mp4`,
    poster: `/voices/posters/voice-${String(n).padStart(2, "0")}.webp`,
  }
})

/**
 * Netflix / Prime-Video-style horizontal testimonial wall. Twelve cards in
 * a full-viewport-width row; click any card → portal-mounted modal with
 * autoplay, full controls, page-wide backdrop blur, and body scroll lock.
 *
 * Architectural decisions to NOT simplify away:
 *   - Static poster thumbnails (not <video preload="metadata">) — 12
 *     concurrent metadata fetches saturate the 6-connection-per-host limit.
 *   - createPortal(modal, document.body) — ancestors with CSS transform
 *     (any fade/slide animation) break position: fixed and confine
 *     backdrop-filter to the parent stacking context.
 *   - position: fixed + top: -<scrollY>px on body during lock — plain
 *     overflow: hidden is unreliable on iOS Safari.
 *   - Disable scroll-behavior: smooth before scrollTo on close — otherwise
 *     closing animates a smooth scroll from top down to the section.
 *   - Hardcoded bg-[#0b1226] card fallback — Marine flips ink/background
 *     between dark/light variants, so a token would risk white-on-white
 *     error states.
 *   - bg-transparent on <video> — letterboxing on non-9:16 clips reveals
 *     the blurred page directly, so the video appears to float without
 *     a containing rectangle.
 */
export function VideoTestimonialsWall() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ atStart: true, atEnd: false })
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const atStart = el.scrollLeft <= 4
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
      setEdges({ atStart, atEnd })
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      el.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  // Stagger-reveal cards as the wall scrolls into view. We flip a single
  // boolean on the wrapper; per-card `--i` CSS vars + `.voice-card-rise`
  // keyframe handle the staggered timing in CSS, which keeps the JS lean
  // and lets the browser keep the entrance on the compositor thread.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          obs.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const scroll = (dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" })
  }

  return (
    <div ref={wrapperRef} data-revealed={revealed ? "true" : "false"}>
      {/* Arrow controls — aligned with the section's content gutter so they
          line up with surrounding text/headers. The arrow icon nudges on
          hover to telegraph direction. */}
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
        <div className="hidden md:flex justify-end gap-2 mb-5">
          <button
            type="button"
            onClick={() => scroll(-1)}
            disabled={edges.atStart}
            aria-label="Scroll voices left"
            className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/60 text-foreground backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:border-foreground hover:bg-foreground/10 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-background/60 disabled:hover:translate-y-0 disabled:hover:scale-100"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform duration-500 group-hover:-translate-x-0.5"
              strokeWidth={1.6}
            />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            disabled={edges.atEnd}
            aria-label="Scroll voices right"
            className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/60 text-foreground backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:border-foreground hover:bg-foreground/10 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-background/60 disabled:hover:translate-y-0 disabled:hover:scale-100"
          >
            <ArrowRight
              className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5"
              strokeWidth={1.6}
            />
          </button>
        </div>
      </div>

      {/* Full-viewport-width row. Padding-left = section gutter so the first
          card aligns with the section header; the row scrolls to viewport
          edges from there. */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-5 scrollbar-hide pb-4 px-6 sm:px-10 lg:px-16"
      >
        {VOICES.map((v, i) => (
          <VoiceCard
            key={v.src}
            poster={v.poster}
            index={i}
            total={VOICES.length}
            revealed={revealed}
            onOpen={() => setActiveIndex(i)}
          />
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
        <p className="mt-3 text-[0.7rem] uppercase tracking-[0.22em] text-foreground/55 md:hidden">
          Swipe to explore · tap to play
        </p>
      </div>

      {activeIndex !== null && (
        <VideoModal
          voice={VOICES[activeIndex]}
          index={activeIndex}
          total={VOICES.length}
          onClose={() => setActiveIndex(null)}
          onPrev={() =>
            setActiveIndex((i) =>
              i === null ? null : (i - 1 + VOICES.length) % VOICES.length,
            )
          }
          onNext={() =>
            setActiveIndex((i) =>
              i === null ? null : (i + 1) % VOICES.length,
            )
          }
        />
      )}
    </div>
  )
}

function VoiceCard({
  poster,
  index,
  total,
  revealed,
  onOpen,
}: {
  poster: string
  index: number
  total: number
  revealed: boolean
  onOpen: () => void
}) {
  // Each card lifts in with a per-index delay. Combined with the
  // .voice-card-rise CSS (defined in globals.css) this produces a smooth
  // editorial cascade as the wall scrolls into view. We can't use the
  // shared `.reveal` class here because the wall is a horizontal flex
  // row — we want the cards to enter together, not on per-card scroll
  // intersect (which would never fire for off-screen cards in the row).
  const style: CSSProperties = {
    transitionDelay: `${index * 60}ms`,
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Play voice ${index + 1} of ${total}`}
      data-revealed={revealed ? "true" : "false"}
      style={style}
      className="voice-card group relative shrink-0 snap-start overflow-hidden rounded-md bg-[#0b1226] shadow-[0_2px_12px_-6px_rgba(0,0,0,0.25)] ring-1 ring-border transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_22px_44px_-26px_rgba(0,0,0,0.45)] hover:ring-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground active:scale-[0.99] w-[72vw] sm:w-[300px] md:w-[280px] lg:w-[300px] aspect-4/5"
    >
      <Image
        src={poster}
        alt={`Voice ${index + 1} testimonial`}
        fill
        sizes="(max-width: 640px) 72vw, 300px"
        className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
      />

      {/* Bottom gradient — only enough lift to seat the index counter.
          Subtly intensifies on hover so the play affordance feels alive. */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/75 via-black/15 to-transparent pointer-events-none transition-opacity duration-500 group-hover:opacity-90" />

      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-3">
        <span className="text-[0.66rem] uppercase tracking-[0.22em] font-medium text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:tracking-[0.26em]">
          {String(index + 1).padStart(2, "0")}{" "}
          <span className="opacity-60">/ {String(total).padStart(2, "0")}</span>
        </span>
        <span className="font-serif-italic text-[13px] text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] transition-opacity duration-500 group-hover:text-white">
          AIMerge
        </span>
      </div>

      {/* Play affordance — soft pulsing ring on hover, scale + slight
          lift on the icon itself. Sits behind a transparent click target. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-500">
        <span className="absolute inline-flex h-14 w-14 rounded-full bg-white/30 opacity-0 transition-all duration-700 group-hover:h-20 group-hover:w-20 group-hover:opacity-100" />
        <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/95 ring-1 ring-white/40 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-active:scale-95">
          <Play
            className="ml-[3px] h-[18px] w-[18px] text-[#0b1226] transition-transform duration-500 group-hover:translate-x-px"
            fill="currentColor"
            strokeWidth={0}
          />
        </span>
      </div>
    </button>
  )
}

function VideoModal({
  voice,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  voice: Voice
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  // Mount marker for portal — guards against SSR/hydration mismatch.
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setLoading(true)
    setErrored(false)
  }, [voice.src])

  // Lock the page in place + keyboard nav.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowLeft") onPrev()
      else if (e.key === "ArrowRight") onNext()
    }
    window.addEventListener("keydown", onKey)

    const scrollY = window.scrollY
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    }
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = "100%"
    if (scrollbarWidth > 0)
      document.body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev.overflow
      document.body.style.position = prev.position
      document.body.style.top = prev.top
      document.body.style.width = prev.width
      document.body.style.paddingRight = prev.paddingRight
      // Disable smooth-scroll before scrollTo, otherwise closing the
      // modal animates a smooth scroll from top → original position.
      const html = document.documentElement
      const prevScrollBehavior = html.style.scrollBehavior
      html.style.scrollBehavior = "auto"
      window.scrollTo(0, scrollY)
      html.style.scrollBehavior = prevScrollBehavior
    }
  }, [onClose, onPrev, onNext])

  if (!mounted) return null

  return createPortal(
    <div
      className="voice-modal fixed inset-0 z-100 grid place-items-center bg-black/85 backdrop-blur-xl px-4 py-16 sm:py-20"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Voice ${index + 1} of ${total}`}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="group absolute top-5 right-5 sm:top-6 sm:right-6 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 hover:scale-110 hover:bg-white/85 active:scale-95"
      >
        <X
          className="h-5 w-5 transition-transform duration-500 group-hover:rotate-90"
          strokeWidth={1.8}
        />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="voice-modal-stage relative flex flex-col items-center gap-5 max-w-[min(420px,92vw)] w-full"
      >
        {/* Desktop prev/next anchored just outside the video container.
            The icon nudges in the direction of travel on hover. */}
        <button
          type="button"
          aria-label="Previous voice"
          onClick={(e) => {
            e.stopPropagation()
            onPrev()
          }}
          className="group hidden md:inline-flex absolute -left-20 top-1/2 -translate-y-1/2 z-30 h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 hover:scale-110 hover:bg-white/85 active:scale-95"
        >
          <ArrowLeft
            className="h-5 w-5 transition-transform duration-500 group-hover:-translate-x-0.5"
            strokeWidth={1.8}
          />
        </button>
        <button
          type="button"
          aria-label="Next voice"
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          className="group hidden md:inline-flex absolute -right-20 top-1/2 -translate-y-1/2 z-30 h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 hover:scale-110 hover:bg-white/85 active:scale-95"
        >
          <ArrowRight
            className="h-5 w-5 transition-transform duration-500 group-hover:translate-x-0.5"
            strokeWidth={1.8}
          />
        </button>

        <div className="relative w-full aspect-9/16 max-h-[78vh]">
          {loading && !errored && (
            <div className="absolute inset-0 grid place-items-center z-10">
              <div className="h-9 w-9 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
          )}

          {errored ? (
            <div className="absolute inset-0 grid place-items-center px-6 text-center z-10">
              <div>
                <p className="font-serif-italic text-white text-lg mb-2">
                  This voice could not be reached.
                </p>
                <p className="text-[0.72rem] uppercase tracking-[0.22em] text-white/65">
                  Please try another
                </p>
              </div>
            </div>
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              key={voice.src}
              src={voice.src}
              poster={voice.poster}
              autoPlay
              controls
              playsInline
              preload="auto"
              onCanPlay={() => setLoading(false)}
              onError={() => {
                setErrored(true)
                setLoading(false)
              }}
              className="absolute inset-0 w-full h-full object-contain bg-transparent"
            />
          )}
        </div>

        {/* Mobile prev/next under the video for thumb reach. */}
        <div className="flex md:hidden items-center justify-center gap-3 w-full">
          <button
            type="button"
            aria-label="Previous voice"
            onClick={(e) => {
              e.stopPropagation()
              onPrev()
            }}
            className="group inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 hover:scale-110 hover:bg-white/85 active:scale-95"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform duration-500 group-hover:-translate-x-0.5"
              strokeWidth={1.8}
            />
          </button>
          <span className="px-2 text-[0.7rem] uppercase tracking-[0.22em] text-white/85 tabular-nums">
            {String(index + 1).padStart(2, "0")}{" "}
            <span className="opacity-60">
              / {String(total).padStart(2, "0")}
            </span>
          </span>
          <button
            type="button"
            aria-label="Next voice"
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            className="group inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 hover:scale-110 hover:bg-white/85 active:scale-95"
          >
            <ArrowRight
              className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5"
              strokeWidth={1.8}
            />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3 text-white/80">
          <span className="h-px w-6 bg-white/40" />
          <p className="text-[0.7rem] uppercase tracking-[0.22em]">
            Voice {String(index + 1).padStart(2, "0")}
            <span className="opacity-60">
              {" "}
              / {String(total).padStart(2, "0")}
            </span>
          </p>
          <span className="h-px w-6 bg-white/40" />
        </div>
      </div>
    </div>,
    document.body,
  )
}
