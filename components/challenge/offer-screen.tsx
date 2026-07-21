"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, ArrowLeft, Check, Lock, Shield } from "lucide-react"
import { useChallenge, type Audience } from "@/context/challenge-context"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import { ChallengeMenuButton } from "@/components/challenge/challenge-funnel-header-actions"
import { VideoTestimonialsWall } from "@/components/video-testimonials-wall"
import posthog from "posthog-js"
import { track } from "@/lib/fbpixel"
import { STRIPE_PAYMENT_LINKS } from "@/lib/offers"

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
    title: "Your pattern map",
    body: "The repeated moment in plain language, with the earliest point to catch it before it takes over.",
  },
  {
    title: "First moves, anchored to your life",
    body: "What to do when the trigger appears, built around a person, place, or object already in your week - when, the action, and what done looks like.",
  },
  {
    title: "Your Evidence Log",
    body: "Not affirmations - evidence. A log for each time you catch the moment, with the first entry already filled in from your own answers.",
  },
  {
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
 *  "quoted moment". Empty string when the answer is too short to quote. */
function extractQuotedMoment(q1: string): string {
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
    <div className="min-h-screen">
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

      {/* 1. Result bridge - their insight, pointed forward */}
      <section className="px-5 pt-8 pb-10 sm:px-8 sm:pt-12 sm:pb-14">
        <div className="mx-auto max-w-4xl">
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
            You now know what may be happening and where it begins. What you do
            not yet have is the exact response: what to do inside that moment,
            what to prepare beforehand, and how to tell whether it is changing.
          </p>
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
          <p className="eyebrow mb-3 text-foreground/70">One-time purchase</p>
          <h2 className="font-serif text-[26px] leading-[1.12] text-ink sm:text-[32px]">
            Personalized 30-Day
            <span className="block font-serif-italic text-foreground">
              Belief Action Plan
            </span>
          </h2>

          {/* Free vs paid distinction, stated plainly */}
          <p className="mt-5 max-w-xl text-[15px] leading-[1.75] text-foreground/75">
            The free Belief Score helps you see the pattern. The Action Plan
            helps you act when it appears.
          </p>

          <ul className="mt-8 space-y-5">
            {DELIVERABLES.map((d) => (
              <li key={d.title} className="flex items-start gap-4">
                <span
                  className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--signal)", color: "var(--background)" }}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="font-serif text-[18px] leading-snug text-ink">
                    {d.title}
                  </p>
                  <p className="mt-1 text-[14.5px] leading-[1.7] text-foreground/75">
                    {d.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Personalization proof - honestly labeled locked fields */}
          <div className="mt-9 rounded-md border border-border bg-background/60 p-5 sm:p-6">
            <p className="eyebrow mb-1 text-foreground/60">
              Six pages, yours to keep
            </p>
            <p className="mb-4 text-[13px] leading-[1.6] text-foreground/60">
              Generated after purchase, from your completed Belief Score.
            </p>
            <ul className="space-y-2.5">
              {[
                "Your pattern loop and earliest intervention point",
                "Your first moves, in order",
                "Your Evidence Log, first entry filled in",
                "Your 30-day rhythm and day-30 check-in",
              ].map((row) => (
                <li
                  key={row}
                  className="flex items-center gap-3 text-[14px] text-foreground/70"
                >
                  <Lock className="h-3.5 w-3.5 shrink-0 text-foreground/45" strokeWidth={1.6} />
                  {row}
                </li>
              ))}
            </ul>
          </div>

          {/* Honest value frame */}
          <p className="mt-9 max-w-xl text-[15px] leading-[1.8] text-foreground/80">
            A generic worksheet could tell you to set reminders, break the task
            down, or be more consistent. Your Action Plan is built around the
            exact moment you identified, the conclusion that may be active
            inside it, and the evidence you said would matter.
          </p>

          {/* One credibility sentence (credential role only - no ladder,
              no logos on this page) */}
          <p className="mt-6 text-[13.5px] leading-[1.7] text-foreground/65">
            This comes from AI Merge, a peer-reviewed methodology published
            in the Mensa Research Journal.
          </p>

          {/* Price + CTA */}
          <div className="mt-7">
            {ctaButton}
            <p className="mt-4 text-[13px] leading-relaxed text-foreground/60">
              ${PRICE}, one time. Not a subscription. Built from the answers
              you just gave.
            </p>
            <p className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/60">
              <Shield className="h-3 w-3" strokeWidth={1.5} />
              Secure checkout · 30-day rebuild-or-refund, one email
            </p>
          </div>
        </div>
      </section>

      {/* 4. Objection handling - tight, honest */}
      <section className="px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow mb-8 text-foreground/70">Asked plainly</p>
          <dl className="space-y-7">
            {OBJECTIONS.map((o) => (
              <div key={o.q}>
                <dt className="font-serif text-[18px] leading-snug text-ink">
                  {o.q}
                </dt>
                <dd className="mt-2 max-w-xl text-[14.5px] leading-[1.75] text-foreground/75">
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

      {/* Second ask after the proof */}
      <section className="border-t border-border px-5 py-14 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-4">
          <h3 className="font-serif text-[22px] leading-snug text-ink sm:text-[26px]">
            Turn the pattern you identified
            <span className="block font-serif-italic text-foreground">
              into a sequence you can use.
            </span>
          </h3>
          {ctaButton}
        </div>
      </section>

      {/* Exit section */}
      <section className="bg-background px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow mb-6 text-foreground/70">
            IX · If now is not the right time
          </p>
          <h3 className="mb-7 font-serif text-[1.6rem] leading-[1.18] text-ink sm:text-[1.95rem] sm:leading-snug">
            Your Belief Score is yours
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
            The Belief Score and AI Merge are tools for self-reflection. They
            are not medical, psychological, or clinical treatment and are not
            a substitute for professional care.
          </p>
          <p className="mt-4 font-serif-italic text-[13px] text-foreground/55">
            Composed quietly. Read at your own pace.
          </p>
        </div>
      </footer>
    </div>
  )
}
