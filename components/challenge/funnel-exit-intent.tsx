"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, Lock, X } from "lucide-react"
import { useChallenge, type Audience } from "@/context/challenge-context"
import { normalizeVertical, verticalFromHost, type Vertical } from "@/lib/verticals"
import { displayFor } from "@/lib/vertical-display"
import {
  DIMENSION_COLORS,
  DIMENSION_ICONS,
  DIMENSION_ORDER,
  ScoreRing,
} from "@/components/challenge/score-visuals"
import { overallOf } from "@/components/visuals/report-preview"
import { Atmosphere } from "@/components/visuals/atmosphere"
import { B2B_ACTION_PLAN_PRICE } from "@/lib/offers"

/**
 * Funnel-wide desktop exit-intent, vertical-voiced and stage-aware.
 *
 * Fires (once per stage per browser session) when the cursor leaves through
 * the top of the viewport on any /challenge/* page, EXCEPT:
 *  - thank-you and the report (they've purchased - never re-sell), and
 *  - any session where the purchase already completed (state.isComplete).
 *
 * Two stages, because the honest lever changes:
 *  - "started": mid-assessment. The lever is proximity - the score is
 *    minutes away and their answers are already in.
 *  - "scored": summary/offer reached, not purchased. The lever is
 *    possession - THEIR score exists (shown), the plan that reads it is a
 *    page away.
 *
 * Register rules carry over from the conversion docs: every figure is a
 * published-research approximation with its source named (never invented
 * specificity), the ADHD voice never shames a lapse, the B2B voice gets no
 * consumer FOMO at all, and there are no countdowns or scarcity anywhere -
 * the door stays open, and the copy says so.
 */

const sessionKey = (stage: Stage) => `funnel-exit-intent-${stage}`

type Stage = "started" | "scored"

interface ExitCopy {
  eyebrow: string
  title: string
  accent: string
  /** Stat rows - published approximations only; keep to 2-3. */
  facts: Array<{ figure: string; label: string }>
  /** Source/footnote line under the facts (honesty layer). */
  source?: string
  /** Stage-specific closing line above the CTA. */
  lineStarted: string
  lineScored: string
  ctaScored: string
}

const EXIT_COPY: Record<Vertical, ExitCopy> = {
  main: {
    eyebrow: "Before you go",
    title: "Doubt, unexamined,",
    accent: "compounds for decades.",
    facts: [
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
    ],
    source:
      "Figures from published research on self-efficacy and the impostor phenomenon (Bravata et al. 2020; Stajkovic & Luthans 1998).",
    lineStarted:
      "Your answers so far are saved. The score they add up to is minutes away.",
    lineScored:
      "Your score is done. The plan that reads it - your pattern, your first moves, your evidence log - is one page away.",
    ctaScored: "See my Action Plan · $47",
  },
  retargeting: {
    eyebrow: "Before you go - again is fine",
    title: "Coming back",
    accent: "is the skill.",
    facts: [
      {
        figure: "Saved",
        label:
          "Everything you've entered stays exactly where you left it. There is no deadline on any of this.",
      },
      {
        figure: "0",
        label:
          "pressure. Your score doesn't expire, and returning later counts just as much as staying now.",
      },
    ],
    lineStarted:
      "You came back once already - that's the hard part. The score is minutes from here.",
    lineScored:
      "Your score is done and it isn't going anywhere. Neither is the plan - but it is already written.",
    ctaScored: "See my Action Plan · $47",
  },
  adhd: {
    eyebrow: "Before you go",
    title: "The loop doesn't",
    accent: "age out on its own.",
    facts: [
      {
        figure: "~4%",
        label:
          "of adults live with ADHD - and most have spent years being told to try harder, not shown what the pattern is protecting.",
      },
      {
        figure: "2 in 3",
        label:
          "childhood cases persist into adulthood. The urgency-rescue loop is not a phase; it is a structure - and structures can be mapped.",
      },
    ],
    source:
      "Approximations from published prevalence research (Kessler et al. 2006; Faraone et al. 2006). Not a diagnosis - a reflection of one pattern.",
    lineStarted:
      "No pressure, and no streak to break - your answers are saved either way. But the score is genuinely minutes away, and it's built from what you already wrote.",
    lineScored:
      "Your score is done. The plan it unlocks has no system to maintain, no daily hour, no streak to break - one watchable moment, from your own words.",
    ctaScored: "See my Action Plan · $47",
  },
  healthcare: {
    eyebrow: "Before you go",
    title: "One operating moment,",
    accent: "mapped end to end.",
    facts: [
      {
        figure: "1 person",
        label:
          "is where critical answers live in many operations. The Profile names that loop from your own account - trigger, fallback, non-capture, return.",
      },
      {
        figure: "30 days",
        label:
          "is the bounded first-proof window the Action Plan is designed around - measurable, no new headcount, yours to test.",
      },
    ],
    lineStarted:
      "Your account of the operating moment is saved. The Profile it produces takes minutes, and what you do with it stays entirely yours.",
    lineScored:
      "Your Belief Profile is complete. The Action Plan that turns it into a governed next step is one page away - a deliverable, not a doorway to a pitch.",
    ctaScored: `Review the Action Plan · $${B2B_ACTION_PLAN_PRICE}`,
  },
  // No numeric "facts" here on purpose. The coaches source docs ban invented
  // statistics outright, and there is no published figure that honestly
  // covers "coaches who build instead of selling" - so both rows carry a
  // non-numeric figure, the same shape the retargeting entry uses.
  coaches: {
    eyebrow: "Before you go",
    title: "The work is ready.",
    accent: "The invitation is what waits.",
    facts: [
      {
        figure: "Saved",
        label:
          "Everything you've written so far stays exactly where you left it. Nothing here expires and nothing has to be redone.",
      },
      {
        figure: "One moment",
        label:
          "This isn't a review of your offer, your pricing, or your methodology. It's one repeated commercial moment, mapped from your own words.",
      },
    ],
    lineStarted:
      "Your answers so far are saved. The score they add up to is minutes away, and it is built from what you already wrote.",
    lineScored:
      "Your score is done. The plan that reads it - the moment to watch, the next evidence, and what to say instead of adding more - is one page away.",
    ctaScored: "See my Action Plan · $47",
  },
  // No numeric "facts" here on purpose, and not only because the parents
  // source docs ban invented statistics. There IS one verified published
  // figure available for this audience (the APA parental-stress numbers cited
  // in its ICP Matrix), and it is deliberately NOT used: this vertical's whole
  // argument is that care arriving as alarm is the problem, so quoting a
  // stress statistic at a hesitating parent would commit the exact error the
  // funnel is examining. Both rows carry a non-numeric figure, the same shape
  // retargeting and coaches use.
  parents: {
    eyebrow: "Before you go",
    // The title used to be the reassurance ("This looks at you, never at your
    // child"). True, and still on the page - it is the second fact row below -
    // but a reassurance is not a reason to stay. At the moment of exit the
    // stronger line is the one that names what closing the tab costs, and for
    // this audience that is time: the distance accumulated over years, and the
    // thing being abandoned takes ten minutes. No countdown, no scarcity, no
    // claim about the child - just the asymmetry, stated once.
    title: "The distance took years.",
    accent: "This takes about ten minutes.",
    facts: [
      {
        figure: "Saved",
        label:
          "Everything you've written so far stays exactly where you left it. Nothing here expires and nothing has to be redone.",
      },
      {
        figure: "One moment",
        label:
          "It looks at you, never at your child. Not your whole history as a parent - one recurring moment, in your own words.",
      },
    ],
    lineStarted:
      "Your answers so far are saved. The score they add up to is minutes away, and it is built from what you already wrote.",
    lineScored:
      "Your score is done. The plan that reads it - what may be entering your response, and the moment where more choice is still available - is one page away.",
    ctaScored: "See my Action Plan · $47",
  },
}

/** Paths where the modal must never appear. */
const EXCLUDED = [/\/challenge\/thank-you/, /\/challenge\/report/]

export function FunnelExitIntent() {
  const pathname = usePathname()
  const { state, isHydrated } = useChallenge()
  const [open, setOpen] = useState(false)

  // ── Vertical: the PAGE decides, never the visitor's stored session ──
  // Resolution: /challenge/<vertical>/* segment → ?vertical|lp|v param (the
  // entry page) → subdomain → main.
  //
  // `state.audience` is deliberately NOT consulted. It used to be, and that
  // caused a cross-vertical leak: a visitor who had previously run the ADHD
  // funnel carried `audience: "adhd"` in localStorage, so the MAIN landing
  // page (no /challenge segment to match) fell through to that stale value
  // and served them the ADHD modal. A page's vertical is a property of the
  // page, not of whoever is looking at it.
  const segMatch = pathname?.match(/^\/challenge\/([^/]+)/)
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null
  const vertical: Vertical =
    normalizeVertical(segMatch?.[1]) ??
    normalizeVertical(
      params?.get("vertical") ?? params?.get("lp") ?? params?.get("v"),
    ) ??
    (typeof window !== "undefined" ? verticalFromHost(window.location.hostname) : null) ??
    "main"

  // Stage: "scored" only when the stored session belongs to THIS vertical.
  // A stored ADHD score must never be rendered under main's pillar labels
  // (or vice versa) - that session's result belongs to a different funnel.
  const sessionMatchesPage = state.audience === vertical
  const stage: Stage =
    state.clarityScore && sessionMatchesPage ? "scored" : "started"
  const stageRef = useRef(stage)
  stageRef.current = stage

  const excluded =
    !pathname ||
    EXCLUDED.some((re) => re.test(pathname)) ||
    state.isComplete

  useEffect(() => {
    if (!isHydrated || excluded) return
    try {
      if (sessionStorage.getItem(sessionKey(stageRef.current))) return
    } catch {
      /* sessionStorage blocked - listener is harmless */
    }

    let armed = false
    const armTimer = window.setTimeout(() => {
      armed = true
    }, 4000)

    const onMouseOut = (e: MouseEvent) => {
      if (!armed) return
      if (e.clientY > 0 || e.relatedTarget) return
      try {
        if (sessionStorage.getItem(sessionKey(stageRef.current))) return
        sessionStorage.setItem(sessionKey(stageRef.current), "1")
      } catch {
        /* ignore */
      }
      setOpen(true)
    }

    document.addEventListener("mouseout", onMouseOut)
    return () => {
      window.clearTimeout(armTimer)
      document.removeEventListener("mouseout", onMouseOut)
    }
  }, [isHydrated, excluded])

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

  if (!open || excluded) return null

  const copy = EXIT_COPY[vertical]
  const display = displayFor(vertical)
  const overall = state.clarityScore ? overallOf(state.clarityScore.subscores) : null
  const audienceForRoute: Audience = vertical
  // On the landing (outside /challenge) a "keep going" close makes no sense
  // - the started-stage CTA becomes the door INTO the assessment instead.
  const inFunnel = pathname?.startsWith("/challenge") ?? false

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="funnel-exit-title"
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <div className="relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-card shadow-[0_30px_80px_-30px_rgba(var(--shadow-ink),0.6)] animate-fade-in-up">
        {/* Ambient layer + signal hairline - same visual system as the
            funnel pages, so the modal reads as the product, not an ad. */}
        <Atmosphere intensity={0.9} />
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--signal), transparent)" }}
          aria-hidden
        />

        <div className="relative p-5 sm:p-8">
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
            {copy.eyebrow}
          </p>

          <h2
            id="funnel-exit-title"
            className="font-serif text-[22px] leading-[1.18] text-ink sm:text-[28px] sm:leading-[1.15]"
          >
            {copy.title}
            <span className="block font-serif-italic text-foreground">
              {copy.accent}
            </span>
          </h2>

          {stage === "scored" && overall !== null && state.clarityScore ? (
            /* Scored stage: THEIR result as a mini dashboard - overall ring
               plus the four real dimension meters in their owned colors.
               The one thing they'd leave behind, made visible. */
            <div
              className="mt-5 rounded-md border border-border p-4 sm:p-5"
              style={{
                background:
                  "linear-gradient(150deg, color-mix(in srgb, var(--signal) 10%, var(--background)) 0%, var(--background) 65%)",
              }}
            >
              <div className="flex items-center gap-4">
                <ScoreRing value={overall} size={64} stroke={5} color="var(--signal)">
                  <span className="font-serif text-[18px] leading-none tabular-nums text-ink">
                    {overall}
                  </span>
                </ScoreRing>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/55">
                    Your {display.productName}
                  </p>
                  {/* Dimension readings are paid content - sealed strips
                      only, no values, no proportional bars. */}
                  <div className="mt-2 space-y-1.5">
                    {DIMENSION_ORDER.map((k) => {
                      const Icon = DIMENSION_ICONS[k]
                      const color = DIMENSION_COLORS[k]
                      return (
                        <div key={k} className="flex items-center gap-2">
                          <span
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                            style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
                          >
                            <Icon className="h-2 w-2" strokeWidth={2.2} aria-hidden />
                          </span>
                          <span
                            className="relative h-1 flex-1 overflow-hidden rounded-full border border-dashed"
                            style={{
                              borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
                              background: `color-mix(in srgb, ${color} 8%, transparent)`,
                            }}
                            aria-label="Reading locked"
                          />
                          <span className="flex w-5 justify-end text-foreground/45">
                            <Lock className="h-2.5 w-2.5" strokeWidth={1.8} aria-hidden />
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-[1.6] text-foreground/70">
                Scored from your own words - the four readings unlock inside
                your plan.
              </p>
            </div>
          ) : (
            /* Started stage: the four dimensions being assessed, as chips -
               the product's shape, mid-construction. */
            <div className="mt-5 flex flex-wrap gap-2">
              {DIMENSION_ORDER.map((k) => {
                const Icon = DIMENSION_ICONS[k]
                const color = DIMENSION_COLORS[k]
                return (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] uppercase tracking-[0.16em]"
                    style={{
                      borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
                      background: `color-mix(in srgb, ${color} 9%, transparent)`,
                      color,
                    }}
                  >
                    <Icon className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
                    {display.pillarLabels[k].label}
                  </span>
                )
              })}
            </div>
          )}

          {/* Facts as designed stat tiles, not text rows */}
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {copy.facts.map((s) => (
              <div
                key={s.figure}
                className="rounded-md border border-border bg-background/45 px-4 py-3.5"
              >
                <p className="font-serif text-[22px] leading-none tabular-nums text-ink">
                  {s.figure}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-[1.55] text-foreground/80">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {copy.source && (
            <p className="mt-3 text-[11px] leading-[1.6] text-foreground/50">
              {copy.source}
            </p>
          )}

          <p className="mt-4 border-l-2 pl-3.5 font-serif-italic text-[14.5px] leading-[1.65] text-ink/90 sm:text-[15px]"
            style={{ borderColor: "color-mix(in srgb, var(--signal) 60%, transparent)" }}
          >
            {stage === "scored" ? copy.lineScored : copy.lineStarted}
          </p>

        <div className="mt-6 flex flex-col gap-3">
          {stage === "scored" ? (
            <Link
              href={`/challenge/${audienceForRoute}/offer`}
              onClick={() => setOpen(false)}
              className="s-btn group w-full justify-center"
              style={{
                background: "var(--signal)",
                color: "var(--background)",
                border: "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
              }}
            >
              {copy.ctaScored}
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                strokeWidth={1.6}
              />
            </Link>
          ) : inFunnel ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="s-btn group w-full justify-center"
            >
              Keep going - it&apos;s minutes away
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                strokeWidth={1.6}
              />
            </button>
          ) : (
            <Link
              href="/challenge/audience"
              onClick={() => setOpen(false)}
              className="s-btn group w-full justify-center"
            >
              Get Your Free {display.productName}
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                strokeWidth={1.6}
              />
            </Link>
          )}
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
    </div>
  )
}
