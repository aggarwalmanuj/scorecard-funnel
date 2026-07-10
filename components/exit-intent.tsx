"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, X } from "lucide-react"

const SESSION_KEY = "exit-intent-fired"

/**
 * Stats shown in the exit modal. Widely-reported figures from published
 * self-belief research, kept as approximations rather than fake precision:
 * impostor phenomenon prevalence (Bravata et al. 2020 systematic review),
 * self-efficacy and performance (Stajkovic & Luthans 1998 meta-analysis of
 * 114 studies), the qualification/application gap (HP internal report,
 * popularized by Mohr 2014), and top-quartile self-underestimation
 * (Kruger & Dunning 1999).
 */
const STATS: Array<{ figure: string; label: string }> = [
  {
    figure: "70%",
    label:
      "of professionals report impostor feelings at some point in their careers, across four decades of peer-reviewed studies.",
  },
  {
    figure: "+28%",
    label:
      "higher performance among people with strong belief in their own capability, across a meta-analysis of 114 studies.",
  },
  {
    figure: "60%",
    label:
      "of the qualifications is enough for some people to go for the role. Others wait for all of them. The gap is belief, not ability.",
  },
  {
    figure: "Top 25%",
    label:
      "performers are among the most likely to underestimate where they stand. Capability and self-belief are different signals.",
  },
]

/**
 * Desktop exit-intent. When the cursor leaves through the TOP of the viewport
 * (heading for the tab bar / close / address bar), show — once per browser
 * session — a modal that makes the long-term cost of an unexamined pattern
 * concrete, with a path into the free assessment. Replaces the old redirect
 * to /offer: instead of a price, the leaving visitor sees the gravity of
 * doing nothing. Mouse-based, so desktop-only by nature — mobile back/close
 * can't be intercepted without hostile history hacks, which we avoid.
 */
export function ExitIntent() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return
    } catch {
      /* sessionStorage blocked - just proceed, the listener is harmless */
    }

    // Grace period so it can't fire the instant the page loads.
    let armed = false
    const armTimer = window.setTimeout(() => {
      armed = true
    }, 4000)

    const cleanup = () => {
      window.clearTimeout(armTimer)
      document.removeEventListener("mouseout", onMouseOut)
    }

    const onMouseOut = (e: MouseEvent) => {
      if (!armed) return
      // Left through the top edge, and actually left the document (no element
      // the cursor moved onto).
      if (e.clientY > 0 || e.relatedTarget) return
      try {
        sessionStorage.setItem(SESSION_KEY, "1")
      } catch {
        /* ignore */
      }
      cleanup()
      setOpen(true)
    }

    document.addEventListener("mouseout", onMouseOut)
    return cleanup
  }, [])

  // While open: lock body scroll, let Esc dismiss (mirrors the modal pattern
  // used across the funnel).
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-[0_30px_80px_-30px_rgba(var(--shadow-ink),0.6)] animate-fade-in-up sm:p-9 max-h-[88vh] overflow-y-auto">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-secondary hover:text-ink"
        >
          <X className="h-4 w-4" strokeWidth={1.6} />
        </button>

        <p className="eyebrow mb-4 text-foreground/65 sm:mb-5">
          <span className="pulse-dot mr-2.5" aria-hidden />
          Before you go
        </p>

        <h2
          id="exit-intent-title"
          className="font-serif text-[22px] leading-[1.18] text-ink sm:text-[30px] sm:leading-[1.15]"
        >
          Doubt, unexamined,
          <span className="block font-serif-italic text-foreground">
            compounds for decades.
          </span>
        </h2>

        {/* Stat rows: on phones the figure sits ABOVE its line (a right-
            aligned 6rem column would waste a third of a 360px card); from sm
            up they align in two columns on a shared baseline. */}
        <div className="mt-5 space-y-4 sm:mt-6">
          {STATS.map((s) => (
            <div
              key={s.figure}
              className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="shrink-0 font-serif text-[20px] leading-none text-ink tabular-nums sm:w-24 sm:text-right sm:text-[24px]">
                {s.figure}
              </span>
              <p className="text-[13.5px] leading-[1.6] text-foreground/85 sm:text-[14px] sm:leading-[1.65]">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[12.5px] leading-[1.65] text-foreground/60 sm:mt-6 sm:text-[13px]">
          Figures from published research on self-efficacy and the impostor
          phenomenon. The doubt doesn&apos;t wait. Every year it runs unnamed,
          it gets more expensive.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:mt-7">
          <Link
            href="/challenge/audience"
            onClick={() => setOpen(false)}
            className="s-btn group w-full justify-center"
          >
            Find what&apos;s running underneath. Free.
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
              strokeWidth={1.6}
            />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mx-auto inline-flex items-center text-[12px] uppercase tracking-[0.22em] text-foreground/55 transition-colors hover:text-ink"
          >
            Not today
          </button>
        </div>
      </div>
    </div>
  )
}
