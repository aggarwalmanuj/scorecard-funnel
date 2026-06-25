"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowRight, Pause, Play } from "lucide-react"
import { MagneticButton, Reveal } from "./motion"

/**
 * Walkthrough - the conversion-critical "see the whole reading before you
 * begin" catalogue. Ad visitors were bouncing because the ask had no
 * visible shape: they couldn't tell what they'd do or what they'd get.
 * This previews the entire funnel with the real product screenshots so the
 * commitment feels known, not uncertain.
 *
 * Motion intent: a story-style auto-advance (Instagram-segments) carries
 * passive visitors through all five steps without a click - the single
 * most important thing is that they *see* the arc. It is fully pausable
 * (WCAG 2.2.2), pauses on hover/focus so it never fights the reader, and
 * defaults to paused under prefers-reduced-motion. The image crossfade and
 * the step-reveal are opacity/transform only, so they stay on the
 * compositor at 60fps.
 */

type Step = {
  n: string
  title: string
  meta: string
  img: string
  w: number
  h: number
  alt: string
  what: string
  why: string
}

const steps: ReadonlyArray<Step> = [
  {
    n: "01",
    title: "Tell us who's reading",
    meta: "30 seconds",
    img: "/take/audience.png",
    w: 1880,
    h: 892,
    alt: "The opening screen - your name, your email, and whether the reading is for you or your team.",
    what: "Your name, your email, and whether the reading is for you or for your team.",
    why: "The diagnostic calibrates to your level - and your results are sent to you, yours to keep.",
  },
  {
    n: "02",
    title: "Answer five honest questions",
    meta: "≈ 7 minutes",
    img: "/take/question.png",
    w: 1888,
    h: 906,
    alt: "A question screen - a single open question with the option to speak your answer aloud or type it.",
    what: "Five open questions across seven dimensions. Speak each answer aloud, or type it.",
    why: "There's nothing to study and no right answer. You're simply describing what's true right now.",
  },
  {
    n: "03",
    title: "Watch it reflect back",
    meta: "As you go",
    img: "/take/beat.png",
    w: 1879,
    h: 891,
    alt: "A reflection screen - the reading mirrors what you've just said back to you in composed language.",
    what: "Between questions, the reading mirrors what you've said back in short, composed reflections.",
    why: "This is the moment most people feel seen - language for what they already knew but couldn't name.",
  },
  {
    n: "04",
    title: "Receive your score",
    meta: "Instant",
    img: "/take/reportsummary.png",
    w: 1792,
    h: 815,
    alt: "The results screen - a Clarity Readiness Index score with four pillars scored beneath it.",
    what: "Your Belief Score across four pillars - and the one constraint running underneath.",
    why: "A precise, honest reading. Not a personality label. It shows you exactly where to look first.",
  },
  {
    n: "05",
    title: "Go deeper, if you choose",
    meta: "Optional",
    img: "/take/reportpdf.png",
    w: 988,
    h: 769,
    alt: "The full diagnostic report - an expanded, personalised breakdown across every dimension.",
    what: "A full diagnostic report and a personal audio composition, built around your exact answers.",
    why: "The complete picture: what the pattern means, what's in the way, and what shifts when it lifts.",
  },
]

const ADVANCE_MS = 6500

export function WalkthroughSection() {
  const [active, setActive] = useState(0)
  const [userPlaying, setUserPlaying] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const [reduced, setReduced] = useState(true)

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  // Start auto-advance after mount unless the visitor prefers reduced
  // motion. Doing this in an effect (rather than at init) keeps SSR output
  // deterministic and honours the OS setting.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    setUserPlaying(!mq.matches)
    const onChange = (e: MediaQueryListEvent) => {
      setReduced(e.matches)
      setUserPlaying(!e.matches)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const running = userPlaying && !interacting

  // Auto-advance. Depending on `active` resets the timer whenever the step
  // changes (including manual selection) so a step always gets its full
  // dwell time before moving on.
  useEffect(() => {
    if (!running) return
    const id = window.setTimeout(
      () => setActive((i) => (i + 1) % steps.length),
      ADVANCE_MS,
    )
    return () => window.clearTimeout(id)
  }, [running, active])

  // Selection with optional focus move. Auto-advance must NOT steal focus;
  // keyboard/click selection should.
  const select = useCallback((index: number, focus = false) => {
    setActive(index)
    if (focus) tabRefs.current[index]?.focus()
  }, [])

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const last = steps.length - 1
    let next: number | null = null
    if (e.key === "ArrowDown" || e.key === "ArrowRight")
      next = active === last ? 0 : active + 1
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
      next = active === 0 ? last : active - 1
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = last
    if (next !== null) {
      e.preventDefault()
      select(next, true)
    }
  }

  const current = steps[active]

  return (
    <section
      id="walkthrough"
      className="py-16 sm:py-28 lg:py-32"
      aria-labelledby="walkthrough-heading"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-16">
        {/* Chapter head */}
        <Reveal as="div" className="grid items-end gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-6 text-foreground/70">
              III · The walkthrough
            </p>
            <h2
              id="walkthrough-heading"
              className="font-serif text-[1.95rem] leading-[1.08] text-ink sm:text-5xl sm:leading-[1.05] lg:text-6xl"
            >
              See the whole reading
              <span className="block font-serif-italic text-foreground">
                before you begin.
              </span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-lg leading-[1.8] text-foreground/85">
              Ten minutes. Five questions. One honest reading.
            </p>
            <p className="mt-3 text-[15px] leading-[1.75] text-foreground/70">
              Here is every step, start to finish - so you know exactly what
              you&apos;re walking into, and what you&apos;ll walk away with.
            </p>
          </div>
        </Reveal>

        <Reveal as="div" delay={150} className="my-12 sm:my-16">
          <div className="hairline-anim hairline" />
        </Reveal>

        {/* Catalogue */}
        <Reveal as="div" delay={150}>
          <div
            className="grid gap-10 lg:grid-cols-12 lg:gap-14"
            onMouseEnter={() => setInteracting(true)}
            onMouseLeave={() => setInteracting(false)}
            onFocusCapture={() => setInteracting(true)}
            onBlurCapture={() => setInteracting(false)}
          >
          {/* Stage - browser-framed screenshot with story segments. */}
          <div className="lg:col-span-7">
            <div className="wt-frame relative overflow-hidden rounded-xl bg-card ring-1 ring-border">
              {/* Chrome bar */}
              <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
                <span className="flex gap-1.5" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/25" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                </span>
                <span
                  className="ml-1 hidden truncate rounded-full bg-background/60 px-3 py-1 text-[11px] tracking-wide text-foreground/55 sm:inline-block"
                  aria-hidden
                >
                  honestdecisionchallenge.com / your-reading
                </span>
                {/* Story-style progress segments double as a step picker. */}
                <div
                  className="ml-auto flex items-center gap-1.5"
                  aria-hidden
                >
                  {steps.map((s, i) => (
                    <button
                      key={s.n}
                      type="button"
                      tabIndex={-1}
                      aria-label={`Go to step ${i + 1}: ${s.title}`}
                      onClick={() => select(i)}
                      className="group/seg relative h-1 w-6 overflow-hidden rounded-full bg-foreground/15 sm:w-8"
                    >
                      <span
                        className={`wt-seg-bar absolute inset-0 rounded-full bg-signal ${
                          i < active ? "wt-seg-done" : ""
                        } ${i === active && running ? "wt-seg-fill" : ""} ${
                          i === active && !running ? "wt-seg-now" : ""
                        }`}
                        style={
                          i === active && running
                            ? { animationDuration: `${ADVANCE_MS}ms` }
                            : undefined
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Image - single tabpanel, all slides stacked + crossfaded. */}
              <div
                id="wt-panel"
                role="tabpanel"
                tabIndex={0}
                aria-labelledby={`wt-tab-${active}`}
                className="wt-stage relative w-full"
              >
                {steps.map((s, i) => (
                  <div
                    key={s.n}
                    aria-hidden={i !== active ? "true" : "false"}
                    className={`absolute inset-0 transition-opacity duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      i === active
                        ? "opacity-100"
                        : "pointer-events-none opacity-0"
                    }`}
                  >
                    <Image
                      src={s.img}
                      alt={i === active ? s.alt : ""}
                      fill
                      sizes="(max-width: 1024px) 100vw, 58vw"
                      className="object-cover object-top"
                      priority={i === 0}
                      loading={i === 0 ? undefined : "lazy"}
                    />
                  </div>
                ))}
                {/* Soft inner vignette so cropped screenshots feel framed. */}
                <span aria-hidden className="wt-vignette absolute inset-0" />
              </div>
            </div>

            {/* Caption + transport controls */}
            <div className="mt-5 flex items-center justify-between gap-4">
              <p
                key={current.n}
                className="wt-caption flex items-center gap-3 text-[13px] leading-snug text-foreground/65"
              >
                <span className="font-serif-italic text-base text-foreground/45">
                  {current.n}
                </span>
                <span>{current.meta}</span>
              </p>
              <button
                type="button"
                onClick={() => setUserPlaying((p) => !p)}
                aria-pressed={userPlaying ? "true" : "false"}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-foreground/70 transition-colors duration-300 hover:border-foreground/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]"
              >
                {userPlaying ? (
                  <Pause className="h-3 w-3" strokeWidth={2} aria-hidden />
                ) : (
                  <Play className="h-3 w-3" strokeWidth={2} aria-hidden />
                )}
                {userPlaying ? "Pause" : "Play"}
                <span className="sr-only"> the walkthrough</span>
              </button>
            </div>
          </div>

          {/* Step list - vertical tablist; the active step expands to reveal
              the "why". */}
          <div className="lg:col-span-5">
            <div
              role="tablist"
              aria-label="The reading, step by step"
              aria-orientation="vertical"
              className="flex flex-col"
            >
              {steps.map((s, i) => {
                const on = i === active
                return (
                    <button
                      key={s.n}
                      ref={(el) => {
                        tabRefs.current[i] = el
                      }}
                      type="button"
                      role="tab"
                      id={`wt-tab-${i}`}
                      aria-selected={on ? "true" : "false"}
                      aria-controls="wt-panel"
                      tabIndex={on ? 0 : -1}
                      onClick={() => select(i)}
                      onKeyDown={onTabKeyDown}
                      className="wt-tab group/tab flex w-full items-start gap-4 border-t border-border py-5 text-left last:border-b focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)] sm:gap-5"
                    >
                      <span
                        className={`mt-0.5 font-serif-italic text-2xl tabular-nums transition-colors duration-500 sm:text-3xl ${
                          on ? "text-ink" : "text-foreground/35"
                        }`}
                      >
                        {s.n}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span
                            className={`font-serif text-xl leading-snug transition-colors duration-500 sm:text-2xl ${
                              on ? "text-ink" : "text-foreground/75"
                            }`}
                          >
                            {s.title}
                          </span>
                          <span className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-foreground/45">
                            {s.meta}
                          </span>
                        </span>
                        {/* Expanding detail - grid-rows trick animates height
                            without measuring; only opacity/transform paint. */}
                        <span
                          className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            on
                              ? "mt-3 grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <span className="overflow-hidden">
                            <span className="block text-[14.5px] leading-[1.65] text-foreground/80">
                              {s.what}
                            </span>
                            <span className="mt-2 flex gap-2.5 text-[14.5px] leading-[1.65] text-foreground/60">
                              <span
                                aria-hidden
                                className="mt-2 h-px w-4 shrink-0 bg-signal/70"
                              />
                              <span>{s.why}</span>
                            </span>
                          </span>
                        </span>
                      </span>
                    </button>
                )
              })}
            </div>

            <div className="mt-9">
              <MagneticButton>
                <Link
                  href="/challenge/audience"
                  className="s-btn group w-full justify-center sm:w-auto"
                >
                  Start step one
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                    strokeWidth={1.6}
                  />
                </Link>
              </MagneticButton>
              <p className="mt-4 text-[13px] leading-relaxed text-foreground/55">
                Free. No credit card. Your score, summary, and audio arrive
                the same day.
              </p>
            </div>
          </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
