"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, ArrowLeft, BadgeCheck, CalendarCheck, Footprints, Lock, Map, NotebookPen, Shield } from "lucide-react"
import { useChallenge, type Audience } from "@/context/challenge-context"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import { ChallengeMenuButton } from "@/components/challenge/challenge-funnel-header-actions"
import { VideoTestimonialsWall } from "@/components/video-testimonials-wall"
import posthog from "posthog-js"
import { track } from "@/lib/fbpixel"
import { STRIPE_PAYMENT_LINKS } from "@/lib/offers"
import { displayFor } from "@/lib/vertical-display"
import { persistOfferView } from "@/lib/persist-outputs"
import { MacWindow } from "@/components/visuals/mac-window"
import { ReportPreviewCard, overallOf } from "@/components/visuals/report-preview"
import { PlanTimeline } from "@/components/visuals/plan-timeline"
import { Atmosphere } from "@/components/visuals/atmosphere"
import {
  DIMENSION_COLORS,
  DIMENSION_ORDER,
  ScoreRing,
} from "@/components/challenge/score-visuals"

/**
 * The $47 offer page - a SINGLE product decision, per the product-strategy
 * docs (Prod-03/04): the visitor has just validated an emotionally specific
 * result, so this page has one job - convert that insight into the
 * implementation purchase. The $497 / $1,997 / $4,997 tiers and the two
 * stacked upsell modals are deliberately GONE from this moment: showing the
 * ladder here made the $47 product read as a feeder, added a huge price
 * contrast before the buyer had decided anything, and split attention at
 * the exact moment the decision should be simple. Deeper offers are
 * introduced after purchase and use (thank-you page keeps one restrained
 * line; ascension lives post-engagement).
 *
 * Copy discipline: every deliverable listed below must exist in the actual
 * report artifact (see DEFAULT_REPORT_SYSTEM_PROMPT - pattern + intervention
 * point, four operational moves, 30-day evidence check). Do not add promised
 * components here without extending the report first.
 */

const PRICE = 47

// What the plan contains - matched 1:1 to the artifact's sections AND to the
// summary's spoken deliverables (consistency contract: if wording changes
// here, the summary prompt's Movement 3 must change in the same release).
const DELIVERABLES = [
  {
    icon: Map,
    title: "Your pattern map",
    body: "The repeated moment in plain language, with the earliest point to catch it before it takes over.",
  },
  {
    icon: Footprints,
    title: "First moves, anchored to your life",
    body: "What to do when the trigger appears, built around a person, place, or object already in your week - when, the action, and what done looks like.",
  },
  {
    icon: NotebookPen,
    title: "Your Evidence Log",
    body: "Not affirmations - evidence. A log for each time you catch the moment, with the first entry already filled in from your own answers.",
  },
  {
    icon: CalendarCheck,
    title: "A 30-day rhythm, with a day-30 check-in",
    body: "Week by week, including what to do when a day slips. No streaks, no scores to retake - your own evidence, checked at day 30.",
  },
] as const

const OBJECTIONS = [
  {
    q: "What if the result misunderstood me?",
    a: "The plan is built from your answers and should be treated as a personalized hypothesis. If it does not feel genuinely yours, one email within 30 days gets it rebuilt or refunded - no questions, no exit interview.",
  },
  {
    q: "Is this therapy or a diagnosis?",
    a: "No. It is a structured reflective and implementation tool. It is not medical, psychological, or clinical treatment.",
  },
  {
    q: "Is this a generic worksheet?",
    a: "No. The pattern, intervention point, moves, and evidence plan are generated from the answers you gave in the assessment.",
  },
  {
    q: "Will this solve the entire problem?",
    a: "No. It gives you a concrete 30-day way to test a different response to the moment you identified.",
  },
] as const

/** First sentence of the user's Q1 answer, tightened for display as their
 *  "quoted moment". Empty string when the answer is too short to quote.
 *  Exported for the B2B offer screen, which opens on the same device. */
export function extractQuotedMoment(q1: string): string {
  const text = q1.trim().replace(/\s+/g, " ")
  if (text.length < 20) return ""
  const firstSentence = text.split(/(?<=[.!?])\s/)[0] ?? text
  const clipped =
    firstSentence.length > 140
      ? `${firstSentence.slice(0, 137).replace(/[,;\s]+\S*$/, "")}…`
      : firstSentence
  return clipped.replace(/[.]+$/, "")
}

export function OfferScreen({ audience }: { audience: Audience }) {
  const { state } = useChallenge()
  const [isProcessing, setIsProcessing] = useState(false)
  const quotedMoment = extractQuotedMoment(state.responses.question1 ?? "")
  // Vertical vocabulary (One-Name Law): "ADHD Belief Score" for the ADHD
  // track, plus the vertical's optional reassurance line.
  const display = displayFor(audience)

  // Funnel visibility: record that this lead reached the offer page, so
  // /techadmin can separate "saw the offer" from "purchased". Fires once
  // per mount and never blocks render.
  const offerViewSentRef = useRef(false)
  useEffect(() => {
    if (offerViewSentRef.current) return
    if (!state.serialNumber || !state.email) return
    offerViewSentRef.current = true
    persistOfferView({
      serialNumber: state.serialNumber,
      firstName: state.firstName,
      email: state.email,
    })
  }, [state.serialNumber, state.email, state.firstName])

  // Payment handoff to the Stripe Payment Link (single source of truth in
  // lib/offers.ts). Stripe collects payment + email, then redirects to the
  // thank-you page with ?paid=1&tier=diagnostic&session_id=… so the report
  // unlocks (verified server-side via /api/stripe/verify-session).
  const proceedToCheckout = () => {
    track("InitiateCheckout", {
      value: PRICE,
      currency: "USD",
      content_name: "unfair-advantage-diagnostic",
    })
    try {
      posthog.capture("checkout_start", { price: PRICE })
    } catch {
      /* posthog not initialized (dev without token) */
    }
    const link = STRIPE_PAYMENT_LINKS.diagnostic
    if (!link) {
      console.error('[stripe] no payment link configured for tier "diagnostic"')
      return
    }
    setIsProcessing(true)
    try {
      const url = new URL(link)
      if (state.serialNumber != null)
        url.searchParams.set("client_reference_id", String(state.serialNumber))
      if (state.email) url.searchParams.set("prefilled_email", state.email)
      window.location.assign(url.toString())
    } catch (err) {
      console.error("[stripe] failed to open payment link", err)
      setIsProcessing(false)
    }
  }

  const ctaButton = (
    <button
      type="button"
      onClick={proceedToCheckout}
      disabled={isProcessing}
      className="s-btn group h-13 w-full justify-center px-7 text-[12.5px] sm:w-auto"
      style={{
        background: "var(--signal)",
        color: "var(--background)",
        border: "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
        boxShadow: "0 14px 40px -16px rgba(var(--glow), 0.55)",
      }}
    >
      {isProcessing ? "Opening secure checkout…" : "Get My Personalized Action Plan"}
      {!isProcessing && (
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
          strokeWidth={1.6}
        />
      )}
    </button>
  )

  return (
    <div className="relative min-h-screen pb-24 sm:pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <ChallengeMenuButton />
          <Link href="/" aria-label="Home" className="inline-flex items-center">
            <span className="brand-mark brand-mark-sm" aria-hidden />
          </Link>
          <ChallengeNavHome />
        </div>
      </header>

      {/* 1. Result bridge - their insight, pointed forward, with their
          score standing beside the headline as the thing they earned */}
      <section className="relative overflow-hidden px-5 pt-8 pb-12 sm:px-8 sm:pt-12 sm:pb-16">
        <Atmosphere />
        <div className="relative mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <Link
              href={`/challenge/${audience}/beat-5`}
              prefetch={false}
              className="mb-6 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              Review your results
            </Link>

            <p className="eyebrow mb-4 flex items-center gap-3 text-foreground/70">
              <span className="pulse-dot" aria-hidden />
              VIII · From seeing it to acting on it
            </p>

            <h1 className="mb-5 font-serif text-[1.7rem] leading-[1.1] text-ink sm:text-[2rem] sm:leading-[1.06] md:text-[2.4rem]">
              {state.firstName ? `${state.firstName}, you` : "You"} have
              identified the loop.
              <span className="block font-serif-italic text-foreground">
                Now turn it into a plan for the moment it returns.
              </span>
            </h1>

            {/* Their own words, reflected - the moment they named in Q1.
                Grounds the page in their session instead of generic promise. */}
            {quotedMoment && (
              <blockquote className="mb-5 max-w-xl border-l border-foreground/40 pl-5 font-serif-italic text-[16px] leading-[1.6] text-foreground/80 sm:text-[17px]">
                &ldquo;{quotedMoment}&rdquo;
                <span className="mt-1 block text-[11px] font-sans not-italic uppercase tracking-[0.2em] text-foreground/50">
                  What you told us
                </span>
              </blockquote>
            )}

            {/* 2. The gap */}
            <p className="max-w-xl text-[15.5px] leading-[1.8] text-foreground/80 sm:text-[16.5px]">
              You now know what may be happening and where it begins. What you
              do not yet have is the exact response: what to do inside that
              moment, what to prepare beforehand, and how to tell whether it
              is changing.
            </p>
          </div>

          {/* Their earned score, carried onto this page */}
          {state.clarityScore && (
            <div className="mx-auto flex w-full max-w-[240px] flex-col items-center gap-3 rounded-md border border-border bg-card/70 px-6 py-7 text-center backdrop-blur-sm lg:mx-0">
              <ScoreRing
                value={overallOf(state.clarityScore.subscores)}
                size={116}
                stroke={8}
                color="var(--signal)"
              >
                <span className="font-serif text-[34px] leading-none tabular-nums text-ink">
                  {overallOf(state.clarityScore.subscores)}
                </span>
              </ScoreRing>
              <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/60">
                Your {display.productName}
              </p>
              <div className="flex gap-1.5" aria-hidden>
                {DIMENSION_ORDER.map((k) => (
                  <span
                    key={k}
                    className="h-1.5 w-6 rounded-full"
                    style={{ background: DIMENSION_COLORS[k], opacity: 0.85 }}
                  />
                ))}
              </div>
              <p className="text-[11.5px] leading-snug text-foreground/60">
                Scored from your five answers
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3. The product - one card, one decision */}
      <section
        className="relative px-5 py-12 sm:px-8 sm:py-16"
        style={{
          background: "var(--card)",
          color: "var(--foreground)",
          borderTop: "1px solid color-mix(in srgb, var(--ink) 20%, transparent)",
          borderBottom: "1px solid color-mix(in srgb, var(--ink) 20%, transparent)",
        }}
      >
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, var(--signal), transparent)",
          }}
          aria-hidden
        />

        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <p className="eyebrow text-foreground/70">One-time purchase</p>
            <span
              className="rounded-full px-3 py-1 font-serif text-[14px] tabular-nums"
              style={{
                background: "color-mix(in srgb, var(--signal) 16%, transparent)",
                border: "1px solid color-mix(in srgb, var(--signal) 50%, transparent)",
                color: "var(--signal)",
              }}
            >
              ${PRICE}
            </span>
          </div>
          <h2 className="font-serif text-[26px] leading-[1.12] text-ink sm:text-[32px]">
            Personalized 30-Day
            <span className="block font-serif-italic text-foreground">
              Belief Action Plan
            </span>
          </h2>

          {/* Free vs paid distinction, stated plainly */}
          <p className="mt-5 max-w-xl text-[15px] leading-[1.75] text-foreground/75">
            The free {display.productName} helps you see the pattern. The
            Action Plan helps you act when it appears.
          </p>

          {/* Deliverables as icon cards - the "what's inside" made scannable
              on a phone: one card per artifact, icon chip carrying the
              signal accent, 2-up from sm. */}
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {DELIVERABLES.map((d) => {
              const Icon = d.icon
              return (
                <li
                  key={d.title}
                  className="rounded-md border border-border bg-background/50 p-5"
                >
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      background: "color-mix(in srgb, var(--signal) 18%, transparent)",
                      color: "var(--signal)",
                    }}
                  >
                    <Icon className="h-4.5 w-4.5" strokeWidth={1.7} aria-hidden />
                  </span>
                  <p className="mt-3.5 font-serif text-[17px] leading-snug text-ink">
                    {d.title}
                  </p>
                  <p className="mt-1.5 text-[14px] leading-[1.7] text-foreground/75">
                    {d.body}
                  </p>
                </li>
              )
            })}
          </ul>

          {/* The artifact itself - page one of THEIR report, framed as the
              product it is. Uses the session's real dimension scores when
              they exist; the caption stays honest either way. This is the
              page's proof-adjacency moment: the thing being bought, shown. */}
          <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
            <div className="mx-auto w-full max-w-md lg:max-w-none">
              <MacWindow title="your-action-plan.pdf">
                {/* Only the OVERALL score is ever real pre-purchase; the
                    four dimension readings are paid content and render
                    sealed (policy: pillar scores live inside the plan). */}
                <ReportPreviewCard
                  vertical={audience}
                  locked
                  overall={
                    state.clarityScore
                      ? overallOf(state.clarityScore.subscores)
                      : undefined
                  }
                  animate
                />
              </MacWindow>
              <p className="mt-3 text-center text-[10.5px] uppercase tracking-[0.18em] text-foreground/50">
                {state.clarityScore
                  ? "Your overall score is real - the four readings unlock inside"
                  : "Illustrative - yours is built from your answers"}
              </p>
            </div>

            <div className="rounded-md border border-border bg-background/60 p-5 sm:p-6">
              <p className="eyebrow mb-1 text-foreground/60">
                Six pages, yours to keep
              </p>
              <p className="mb-5 text-[13px] leading-[1.6] text-foreground/60">
                Generated after purchase, from your completed {display.productName}.
              </p>
              <ul className="space-y-3">
                {[
                  "Your pattern loop and earliest intervention point",
                  "Your first moves, in order",
                  "Your Evidence Log, first entry filled in",
                  "Your 30-day rhythm and day-30 check-in",
                ].map((row) => (
                  <li
                    key={row}
                    className="flex items-center gap-3 rounded-md border border-border/60 bg-card/40 px-3.5 py-2.5 text-[14px] text-foreground/75"
                  >
                    <Lock className="h-3.5 w-3.5 shrink-0 text-foreground/45" strokeWidth={1.6} />
                    {row}
                  </li>
                ))}
              </ul>
              <p className="mt-5 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-foreground/50">
                <span className="pulse-dot" aria-hidden />
                Unlocks in minutes after purchase
              </p>
            </div>
          </div>

          {/* The 30-day arc, mapped */}
          <div className="mt-10 rounded-md border border-border bg-background/50 p-6 sm:p-8">
            <p className="eyebrow mb-7 text-foreground/70">Your 30 days, mapped</p>
            <PlanTimeline />
          </div>

          {/* Honest value frame - carded with a signal rail so the page's
              one "why this is different" argument reads as a designed
              moment, not a paragraph adrift. */}
          <div
            className="mt-10 max-w-xl rounded-md border border-border bg-background/50 p-5 sm:p-6"
            style={{ borderLeft: "3px solid var(--signal)" }}
          >
            <p className="text-[15px] leading-[1.8] text-foreground/85">
              A generic worksheet could tell you to set reminders, break the
              task down, or be more consistent. Your Action Plan is built
              around the exact moment you identified, the conclusion that may
              be active inside it, and the evidence you said would matter.
            </p>
            {/* Vertical-specific reassurance (e.g. the ADHD anti-system line) */}
            {display.offerAccent && (
              <p className="mt-3.5 font-serif-italic text-[15.5px] leading-[1.7] text-ink">
                {display.offerAccent}
              </p>
            )}
            {/* One credibility line (credential role only - no ladder,
                no logos on this page) */}
            <p className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-foreground/60">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} aria-hidden />
              AI Merge · peer-reviewed · Mensa Research Journal
            </p>
          </div>

          {/* Price lockup + CTA - the price IS the offer's headline fact:
              impulse-decidable, honestly anchored, nothing recurring. */}
          <div className="mt-10 rounded-md border border-border bg-background/50 p-6 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div className="flex items-baseline gap-3">
                <span className="font-serif leading-none tabular-nums text-ink" style={{ fontSize: "clamp(52px, 8vw, 68px)" }}>
                  ${PRICE}
                </span>
                <span className="pb-1 text-[11px] uppercase tracking-[0.22em] text-foreground/60">
                  one-time
                </span>
              </div>
              <div className="pb-1.5 text-[13.5px] leading-[1.6] text-foreground/75">
                Less than a single coaching session.
                <span className="block text-foreground/60">
                  Not a subscription. Nothing recurring. Built from the answers
                  you just gave.
                </span>
              </div>
            </div>
            <div className="mt-6">{ctaButton}</div>
            <p className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/60">
              <Shield className="h-3 w-3" strokeWidth={1.5} />
              Secure checkout · 30-day rebuild-or-refund, one email
            </p>
          </div>
        </div>
      </section>

      {/* 4. Objection handling - carded, scannable, honest */}
      <section className="px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <p className="eyebrow mb-8 text-foreground/70">
            <span className="mr-3 inline-block h-px w-6 align-middle bg-foreground/40" />
            Asked plainly
          </p>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {OBJECTIONS.map((o) => (
              <div
                key={o.q}
                className="rounded-md border border-border bg-card/60 p-5 sm:p-6"
              >
                <dt className="flex items-start gap-3 font-serif text-[17px] leading-snug text-ink">
                  <span
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-sans text-[13px]"
                    style={{
                      background: "color-mix(in srgb, var(--signal) 15%, transparent)",
                      color: "var(--signal)",
                    }}
                    aria-hidden
                  >
                    ?
                  </span>
                  {o.q}
                </dt>
                <dd className="mt-3 text-[14px] leading-[1.75] text-foreground/75">
                  {o.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Voices wall - social proof between offer and exit */}
      <section
        aria-labelledby="offer-voices-heading"
        className="border-t border-border py-16 sm:py-20"
      >
        <div className="mx-auto mb-10 max-w-4xl px-6 sm:mb-12 sm:px-8">
          <p className="eyebrow mb-4 text-foreground/70">
            <span className="mr-3 inline-block h-px w-6 align-middle bg-foreground/40" />
            Voices from the assessment
          </p>
          <h2
            id="offer-voices-heading"
            className="font-serif text-[26px] leading-[1.15] text-ink sm:text-[32px]"
          >
            Hear from those who
            <span className="block font-serif-italic text-foreground">
              sat with the mirror first.
            </span>
          </h2>
        </div>
        <VideoTestimonialsWall />
        <p className="mx-auto mt-10 max-w-4xl px-6 text-[12px] leading-[1.7] text-foreground/55 sm:px-8">
          Individual experiences shared by AI Merge participants. Results
          describe personal experiences and are not typical or guaranteed.
          Your experience will differ.
        </p>
      </section>

      {/* Second ask after the proof - a poster moment, not a paragraph */}
      <section className="relative overflow-hidden border-t border-border px-5 py-16 sm:px-8 sm:py-20">
        <Atmosphere intensity={1.5} />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-7 text-center">
          {/* Decorative dimension arcs crowning the ask */}
          <div className="flex items-end gap-3" aria-hidden>
            {DIMENSION_ORDER.map((k, i) => (
              <ScoreRing
                key={k}
                value={[62, 78, 54, 70][i]}
                size={i % 2 === 0 ? 40 : 52}
                stroke={4}
                color={DIMENSION_COLORS[k]}
                animate={false}
                trackOpacity={0.25}
              />
            ))}
          </div>
          <h3 className="font-serif text-[24px] leading-snug text-ink sm:text-[30px]">
            Turn the pattern you identified
            <span className="block font-serif-italic text-foreground">
              into a sequence you can use.
            </span>
          </h3>
          {ctaButton}
          <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[10.5px] uppercase tracking-[0.2em] text-foreground/55">
            <span>${PRICE} one-time</span>
            <span aria-hidden>·</span>
            <span>Not a subscription</span>
            <span aria-hidden>·</span>
            <span>30-day refund, one email</span>
          </p>
        </div>
      </section>

      {/* Exit section */}
      <section className="bg-background px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow mb-6 text-foreground/70">
            IX · If now is not the right time
          </p>
          <h3 className="mb-7 font-serif text-[1.6rem] leading-[1.18] text-ink sm:text-[1.95rem] sm:leading-snug">
            Your {display.productName} is yours
            <span className="block font-serif-italic text-foreground">
              regardless.
            </span>
          </h3>

          <div className="mb-7 max-w-xl space-y-5 text-[16px] leading-[1.8] text-foreground/85">
            <p>What surfaced is not going anywhere.</p>
            <p className="text-foreground/75">
              The pattern you saw is now visible - and that visibility alone
              changes how you move.
            </p>
            <p className="text-foreground/75">
              If you want to come back later, the option will be here.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
          >
            Return to the beginning
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] leading-[1.7] text-foreground/55">
            Your answers are used to build your plan and nothing else. They
            are not sold, and they are not used to build anyone else&apos;s
            plan.
          </p>
          <p className="mt-3 text-[12px] leading-[1.7] text-foreground/55">
            The {display.productName} and AI Merge are tools for
            self-reflection. They are not medical, psychological, or clinical
            treatment and are not a substitute for professional care.
          </p>
          <p className="mt-4 font-serif-italic text-[13px] text-foreground/55">
            Composed quietly. Read at your own pace.
          </p>
        </div>
      </footer>

      {/* Sticky buy bar - at EVERY breakpoint, so the decision is never a
          scroll away. Zone-A microcopy only (spec, no hedges, no urgency).
          On desktop it reads as a price+CTA rail; on phones, a thumb bar. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-8 sm:py-3.5">
        <div className="mx-auto flex max-w-5xl flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="hidden min-w-0 items-baseline gap-3 sm:flex">
            <span className="font-serif text-[26px] leading-none tabular-nums text-ink">
              ${PRICE}
            </span>
            <span className="truncate text-[11px] uppercase tracking-[0.18em] text-foreground/60">
              One-time · 30-day refund · Yours to keep
            </span>
          </div>
          <button
            type="button"
            onClick={proceedToCheckout}
            disabled={isProcessing}
            className="s-btn group h-12 w-full justify-center text-[12px] sm:h-11 sm:w-auto sm:shrink-0 sm:px-7"
            style={{
              background: "var(--signal)",
              color: "var(--background)",
              border: "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
            }}
          >
            {isProcessing ? "Opening secure checkout…" : `Get My Action Plan · $${PRICE}`}
          </button>
          <p className="text-center text-[9px] uppercase tracking-[0.18em] text-foreground/55 sm:hidden">
            One-time · 30-day refund · Yours to keep
          </p>
        </div>
      </div>
    </div>
  )
}
