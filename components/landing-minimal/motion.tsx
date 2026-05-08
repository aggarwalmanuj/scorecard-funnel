"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"

/**
 * Reveal - fades + lifts its children when they enter the viewport. Pairs
 * with the `.reveal` / `.is-revealed` CSS in globals.css. The class-based
 * approach (rather than inline transforms) means staggered children can
 * use a single CSS rule and the browser keeps the transition on a single
 * compositor layer.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  threshold = 0.15,
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: "div" | "section" | "p" | "h2" | "h3" | "ul" | "ol" | "li" | "figure" | "aside"
  threshold?: number
}) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          obs.disconnect()
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  const Component = Tag as React.ElementType
  return (
    <Component
      ref={ref}
      className={`reveal ${shown ? "is-revealed" : ""} ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms` } as CSSProperties}
    >
      {children}
    </Component>
  )
}

/**
 * WordReveal - splits text into individual word-spans and animates each
 * with the `.word-rise` keyframe. Used on hero/closing headlines so the
 * type feels like it composes itself rather than appearing.
 *
 * Honors a `kicker` prop for italic emphasis lines and a `block` prop
 * for line breaks (so callers don't have to dangerously inject HTML).
 */
type Segment =
  | { kind: "text"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "br" }

export function WordReveal({
  segments,
  baseDelay = 0,
  className = "",
}: {
  segments: Segment[]
  baseDelay?: number
  className?: string
}) {
  // Flatten into a render plan with per-word indices so we can stagger the
  // CSS variable. Italic segments inherit the .font-serif-italic class.
  let i = 0
  return (
    <span className={className}>
      {segments.map((seg, segIdx) => {
        if (seg.kind === "br") {
          return <br key={`br-${segIdx}`} aria-hidden />
        }
        const words = seg.text.split(/\s+/).filter(Boolean)
        return (
          <span
            key={`seg-${segIdx}`}
            className={
              seg.kind === "italic" ? "font-serif-italic text-foreground" : ""
            }
          >
            {words.map((word, wIdx) => {
              const idx = i++
              const ws =
                wIdx < words.length - 1 || segIdx < segments.length - 1
                  ? " "
                  : ""
              return (
                <span
                  key={`w-${segIdx}-${wIdx}`}
                  className="word-rise"
                  style={
                    {
                      ["--i" as string]: idx,
                      animationDelay: `calc(${idx} * 90ms + ${baseDelay}ms)`,
                    } as CSSProperties
                  }
                >
                  {word}
                  {ws}
                </span>
              )
            })}
          </span>
        )
      })}
    </span>
  )
}

/**
 * LetterReveal - splits a short string into letter-spans for the eyebrow
 * chapter marks. Spaces are preserved as non-breaking so the layout
 * doesn't shift mid-stagger.
 */
export function LetterReveal({
  text,
  className = "",
  baseDelay = 0,
}: {
  text: string
  className?: string
  baseDelay?: number
}) {
  return (
    <span className={className}>
      {Array.from(text).map((ch, idx) => (
        <span
          key={idx}
          className="letter-settle"
          style={
            {
              ["--i" as string]: idx,
              animationDelay: `calc(${idx} * 28ms + ${baseDelay}ms)`,
            } as CSSProperties
          }
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  )
}

/**
 * MagneticButton - wraps its children with a small pointer-following
 * translate, capped at ±10px. Stops on touch devices (no hover) so we
 * don't steal taps. Resets smoothly on leave.
 */
export function MagneticButton({
  children,
  className = "",
  strength = 0.18,
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const supportsHover = window.matchMedia("(hover: hover)").matches
    if (!supportsHover) return

    const handleMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const dx = e.clientX - (rect.left + rect.width / 2)
      const dy = e.clientY - (rect.top + rect.height / 2)
      const tx = Math.max(-10, Math.min(10, dx * strength))
      const ty = Math.max(-10, Math.min(10, dy * strength))
      el.style.setProperty("--mx", String(tx))
      el.style.setProperty("--my", String(ty))
    }
    const handleLeave = () => {
      el.style.setProperty("--mx", "0")
      el.style.setProperty("--my", "0")
    }
    el.addEventListener("pointermove", handleMove)
    el.addEventListener("pointerleave", handleLeave)
    return () => {
      el.removeEventListener("pointermove", handleMove)
      el.removeEventListener("pointerleave", handleLeave)
    }
  }, [strength])

  return (
    <div ref={ref} className={`magnetic ${className}`}>
      {children}
    </div>
  )
}

/**
 * CursorHalo - sets --cx/--cy on its element from pointer position so
 * the `.cursor-halo` ::after gradient follows the mouse. Pairs with
 * the existing signal-halo on the hero image.
 */
export function CursorHalo({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const supportsHover = window.matchMedia("(hover: hover)").matches
    if (!supportsHover) return

    const handleMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = ((e.clientX - rect.left) / rect.width) * 100
      const cy = ((e.clientY - rect.top) / rect.height) * 100
      el.style.setProperty("--cx", String(cx))
      el.style.setProperty("--cy", String(cy))
    }
    el.addEventListener("pointermove", handleMove)
    return () => el.removeEventListener("pointermove", handleMove)
  }, [])

  return (
    <div ref={ref} className={`cursor-halo ${className}`}>
      {children}
    </div>
  )
}

/**
 * ParallaxImage - lightweight scroll parallax. Translates the wrapped
 * image up to ±20px based on its scroll position relative to the viewport
 * center. Disabled when prefers-reduced-motion is set.
 */
export function ParallaxImage({
  children,
  amount = 20,
  className = "",
}: {
  children: ReactNode
  amount?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const winH = window.innerHeight
        // Position 0 → element fully below viewport, 1 → fully above.
        const progress = (winH - rect.top) / (winH + rect.height)
        const clamped = Math.max(0, Math.min(1, progress))
        const offset = (clamped - 0.5) * amount * 2
        el.style.setProperty("transform", `translate3d(0, ${offset.toFixed(2)}px, 0)`)
      })
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(frame)
    }
  }, [amount])

  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  )
}
