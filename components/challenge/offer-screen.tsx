"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Shield,
  Sparkles,
} from "lucide-react"
import { useChallenge, type Audience } from "@/context/challenge-context"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import { ChallengeMenuButton } from "@/components/challenge/challenge-funnel-header-actions"
import { VideoTestimonialsWall } from "@/components/video-testimonials-wall"
import { track } from "@/lib/fbpixel"
import { STRIPE_PAYMENT_LINKS } from "@/lib/offers"

type Tier = "diagnostic" | "session" | "transformation" | "elevated"

// Facebook value per tier (USD) - used for the InitiateCheckout pixel event
// fired at the payment/booking handoff. Mirrors TIER_VALUE on the thank-you
// page (which fires the matching Purchase event) and the Calendly webhook's
// server-side value map. Keep all three in sync.
const TIER_VALUE: Record<Tier, number> = {
  diagnostic: 47,
  session: 497,
  transformation: 1997,
  elevated: 4997,
}

interface TierConfig {
  id: Tier
  price: number
  label: string
  headline: string
  headlineItalic: string
  included: string[]
  valueStatement: string
  cta: string
  featured?: boolean
}

const TIERS: TierConfig[] = [
  {
    id: "diagnostic",
    price: 47,
    label: "Read The Pattern",
    headline: "Read the pattern.",
    headlineItalic: "In plain language.",
    included: [
      "Your full personalised action plan, built from your exact answers",
      "Four scored dimensions - where the friction is coming from",
      "The specific pattern named, sometimes for the first time",
      "Concrete next moves, specific to what you wrote",
    ],
    valueStatement:
      "Not generic advice. Not a quiz result. Your exact words reflected back, with the mechanism underneath made visible - a document you return to.",
    cta: "Get my action plan",
  },
  {
    id: "session",
    price: 497,
    label: "Hear Your Story",
    headline: "Hear your story.",
    headlineItalic: "In your own voice.",
    included: [
      "Everything in the action plan",
      "Your first personalised narrative - your Purpose Story",
      "Built from your exact words and your actual life",
      "No call required - a structured submission at your own pace",
      "Yours permanently",
    ],
    valueStatement:
      "Credited in full toward the Protocol if you go deeper within 30 days.",
    cta: "Hear my story",
    featured: true,
  },
  {
    id: "transformation",
    price: 1997,
    label: "Believe Yourself",
    headline: "Believe yourself.",
    headlineItalic: "Four weeks. Four stories.",
    included: [
      "Everything in the Story Session",
      "One intake conversation with a trained practitioner",
      "Four personalised narratives - Purpose, Past, Future, Integration",
      "A midpoint check-in and an integration session at week four",
      "28-day Signal Wall to make your own change visible",
      "Money-back guarantee",
    ],
    valueStatement:
      "One story shows you what is running. Four walk you through what becomes possible when it stops.",
    cta: "Begin the Protocol",
  },
  {
    id: "elevated",
    price: 4997,
    label: "Build From That Belief",
    headline: "Build from that belief.",
    headlineItalic: "Eight weeks, produced.",
    included: [
      "Everything in the Protocol",
      "Extended to eight weeks - deeper integration, more ground covered",
      "Direct practitioner access between sessions",
      "An additional deep-dive session at week six",
      "Professionally produced audio with original music",
      "A shareable legacy version of your story",
    ],
    valueStatement:
      "Where what you saw, believed, and built becomes something that travels - a produced audio experience your family can hear.",
    cta: "Go Elevated",
  },
]

type ModalKind = "none" | "upsell-1" | "upsell-2"

// Each tier hands off to its Stripe Payment Link (single source of truth in
// lib/offers.ts, shared with the in-report "go deeper" links). Stripe collects
// payment + email, then redirects to our thank-you page — that redirect URL is
// configured PER LINK in the Stripe Dashboard (Payment Link → After payment →
// Redirect customers to your website), set to:
//   https://<site>/challenge/thank-you?paid=1&tier=<id>
// Stripe automatically appends &session_id=… so the thank-you page can unlock
// the report (verified server-side via /api/stripe/verify-session).

export function OfferScreen({ audience }: { audience: Audience }) {
  const { state } = useChallenge()
  const [isProcessing, setIsProcessing] = useState(false)
  const [modal, setModal] = useState<ModalKind>("none")
  const [pendingTier, setPendingTier] = useState<Tier | null>(null)
  // The upsells are shown at most once per visit per the doc spec
  // ("Show ONCE … never show again"). Tracked in component state so
  // refreshes reset - that matches the intent: a single nudge per
  // purchase decision moment, not a hard never-again block.
  const [shownUpsell1, setShownUpsell1] = useState(false)
  const [shownUpsell2, setShownUpsell2] = useState(false)

  // Single chokepoint just before the payment handoff (reached after any
  // upsell decision), so InitiateCheckout fires exactly once per purchase
  // intent regardless of which tier the user lands on. Then we navigate to the
  // tier's Stripe Payment Link. The funnel serial rides along as
  // client_reference_id (Stripe surfaces it on the Checkout Session so the
  // webhook can tie the purchase back to this row), and the email is prefilled.
  // The matching Purchase event fires server-side from the Stripe webhook and
  // on the thank-you page (deduped via the Checkout Session id).
  const proceedToTier = (tier: Tier) => {
    track("InitiateCheckout", {
      value: TIER_VALUE[tier],
      currency: "USD",
      content_name: `unfair-advantage-${tier}`,
    })
    const link = STRIPE_PAYMENT_LINKS[tier]
    if (!link) {
      console.error(`[stripe] no payment link configured for tier "${tier}"`)
      return
    }
    setPendingTier(tier)
    setIsProcessing(true)
    try {
      const url = new URL(link)
      // Reserved Stripe Payment Link query params:
      //   client_reference_id → echoed onto the Checkout Session for the webhook
      //   prefilled_email     → pre-fills the email field on Stripe's page
      if (state.serialNumber != null)
        url.searchParams.set("client_reference_id", String(state.serialNumber))
      if (state.email) url.searchParams.set("prefilled_email", state.email)
      window.location.assign(url.toString())
    } catch (err) {
      console.error("[stripe] failed to open payment link", err)
      setIsProcessing(false)
    }
  }

  const handleTierClick = (tier: Tier) => {
    if (tier === "diagnostic" && !shownUpsell1) {
      setShownUpsell1(true)
      setPendingTier(tier)
      setModal("upsell-1")
      return
    }
    if (tier === "session" && !shownUpsell2) {
      setShownUpsell2(true)
      setPendingTier(tier)
      setModal("upsell-2")
      return
    }
    proceedToTier(tier)
  }

  const acceptUpsell = (upgradedTier: Tier) => {
    setModal("none")
    proceedToTier(upgradedTier)
  }

  const declineUpsell = (originalTier: Tier) => {
    setModal("none")
    proceedToTier(originalTier)
  }

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

      {/* Compact decision header - leads with the title and subhead so
          the pricing grid is in the first viewport on most screens.
          Previously this section started with an editorial figure +
          bridge copy, but that pushed pricing below the fold and felt
          like a content delay before the actual decision moment. */}
      <section className="px-5 pt-8 pb-2 sm:px-8 sm:pt-12">
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
            VIII · Choose how deep you want to go
          </p>

          <h1 className="mb-4 font-serif text-[1.7rem] leading-[1.1] text-ink sm:text-[2rem] sm:leading-[1.06] md:text-[2.4rem]">
            {state.firstName ? `${state.firstName}, your` : "Your"} pattern has
            been
            <span className="block font-serif-italic text-foreground">
              identified.
            </span>
            <span className="mt-2 block">Choose how deep you want to go.</span>
          </h1>

          <p className="max-w-xl text-[15px] leading-[1.75] text-foreground/75 sm:text-[16px]">
            Each step includes everything before it. Go as deep as you choose.
          </p>
        </div>
      </section>

      {/* The Offer - three tiers in a single decision moment.
          Lifted card surface keeps continuity with the rest of the
          funnel; signal hairline accents draw the eye in. */}
      <section
        className="relative px-5 py-10 sm:px-8 sm:py-14 md:py-16"
        style={{
          background: "var(--card)",
          color: "var(--foreground)",
          borderTop:
            "1px solid color-mix(in srgb, var(--ink) 20%, transparent)",
          borderBottom:
            "1px solid color-mix(in srgb, var(--ink) 20%, transparent)",
        }}
      >
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--signal), transparent)",
          }}
          aria-hidden
        />

        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-7 xl:grid-cols-4 xl:items-stretch">
            {TIERS.map((tier, idx) => (
              <TierCard
                key={tier.id}
                tier={tier}
                index={idx}
                isProcessing={isProcessing && pendingTier === tier.id}
                onSelect={() => handleTierClick(tier.id)}
              />
            ))}
          </div>

          <p className="mt-10 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/60">
            <Shield className="h-3 w-3" strokeWidth={1.5} />
            Secure checkout · One-time payment
          </p>
        </div>
      </section>

      {/* Voices wall - keeps social proof between offer and exit */}
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
          <p className="font-serif-italic text-[13px] text-foreground/55">
            Composed quietly. Read at your own pace.
          </p>
        </div>
      </footer>

      {/* Upsell screens - shown ONCE per tier per session, between
          tier selection and the payment handoff. Decline routes to
          the originally-selected tier's checkout. */}
      {modal === "upsell-1" && (
        <UpsellModal
          eyebrow="One more thing before you checkout"
          title="Most people who read the pattern"
          titleItalic="want to hear it in their own voice."
          body={[
            "Most people who unlock the action plan want their story told back to them - in their own words.",
            "For $450 more, you get your first personalised narrative, your Purpose Story - built from your actual life and yours permanently.",
            "That's $497 total instead of $47 - credited in full toward the Protocol if you go deeper within 30 days.",
          ]}
          acceptLabel="Yes, hear my Story - $497"
          declineLabel="No thanks, just the action plan"
          onAccept={() => acceptUpsell("session")}
          onDecline={() => declineUpsell("diagnostic")}
        />
      )}

      {modal === "upsell-2" && (
        <UpsellModal
          eyebrow="Go from one story to four"
          title="One story shows you what is running."
          titleItalic="Four walk you through what changes."
          body={[
            "Your Purpose Story shows you what is running underneath. The full Protocol walks you through what becomes possible when it stops.",
            "Add the four-week Protocol for $1,500 more - four narratives, a practitioner intake, midpoint and integration sessions, and the 28-day Signal Wall.",
            "That's $1,997 total. Your $497 is credited in full.",
          ]}
          acceptLabel="Yes, upgrade to $1,997"
          declineLabel="No thanks, keep my Story"
          onAccept={() => acceptUpsell("transformation")}
          onDecline={() => declineUpsell("session")}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Tier card

function TierCard({
  tier,
  index,
  isProcessing,
  onSelect,
}: {
  tier: TierConfig
  index: number
  isProcessing: boolean
  onSelect: () => void
}) {
  const featured = tier.featured

  return (
    <article
      className="group relative flex flex-col rounded-md p-7 animate-fade-in-up sm:p-8"
      style={{
        background: featured
          ? "color-mix(in srgb, var(--signal) 7%, var(--card))"
          : "color-mix(in srgb, var(--ink) 5%, transparent)",
        border: featured
          ? "1px solid color-mix(in srgb, var(--signal) 45%, transparent)"
          : "1px solid color-mix(in srgb, var(--ink) 18%, transparent)",
        boxShadow: featured
          ? "0 22px 60px -32px rgba(var(--glow), 0.55)"
          : "none",
        animationDelay: `${index * 80}ms`,
        transform: featured ? "translateY(-4px)" : "none",
      }}
    >
      {featured && (
        <div
          className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em]"
          style={{
            background: "var(--signal)",
            color: "var(--background)",
          }}
        >
          <Sparkles className="h-3 w-3" strokeWidth={1.6} />
          Most Popular
        </div>
      )}

      <p
        className="eyebrow mb-4 inline-flex items-center gap-2"
        style={{
          color: featured
            ? "var(--signal)"
            : "color-mix(in srgb, var(--foreground) 72%, transparent)",
        }}
      >
        {featured && (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--signal)" }}
            aria-hidden
          />
        )}
        {tier.label}
      </p>

      <h3 className="mb-5 font-serif text-[22px] leading-[1.18] text-ink sm:text-[24px]">
        {tier.headline}
        <span className="block font-serif-italic text-foreground">
          {tier.headlineItalic}
        </span>
      </h3>

      <div className="mb-5 flex items-baseline gap-1.5">
        <span
          className="font-serif tabular-nums leading-none text-ink"
          style={{ fontSize: "clamp(36px, 5vw, 48px)" }}
        >
          ${tier.price.toLocaleString("en-US")}
        </span>
        <span className="font-serif-italic text-[13px] text-foreground/65">
          one-time
        </span>
      </div>

      <div
        className="mb-6 h-px w-12"
        style={{
          background: featured
            ? "color-mix(in srgb, var(--signal) 70%, transparent)"
            : "color-mix(in srgb, var(--ink) 20%, transparent)",
        }}
      />

      <ul className="mb-6 space-y-3.5 flex-1">
        {tier.included.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
              style={{
                background: featured
                  ? "color-mix(in srgb, var(--signal) 25%, transparent)"
                  : "color-mix(in srgb, var(--ink) 8%, transparent)",
                color: featured ? "var(--signal)" : "var(--ink)",
              }}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={2.2} />
            </span>
            <span className="text-[14.5px] leading-[1.65] text-foreground/90">
              {item}
            </span>
          </li>
        ))}
      </ul>

      <blockquote
        className="mb-7 border-l-2 pl-4 font-serif-italic text-[14px] leading-[1.65] text-foreground/75"
        style={{
          borderColor: featured
            ? "color-mix(in srgb, var(--signal) 60%, transparent)"
            : "color-mix(in srgb, var(--ink) 22%, transparent)",
        }}
      >
        {tier.valueStatement}
      </blockquote>

      <button
        type="button"
        onClick={onSelect}
        disabled={isProcessing}
        className="s-btn group/btn mt-auto h-12 w-full justify-center whitespace-nowrap text-[12px]"
        style={{
          background: featured ? "var(--signal)" : "var(--ink)",
          color: "var(--background)",
          border: featured
            ? "1px solid color-mix(in srgb, var(--signal) 60%, transparent)"
            : "1px solid color-mix(in srgb, var(--ink) 60%, transparent)",
          boxShadow: featured
            ? "0 14px 40px -16px rgba(var(--glow), 0.55)"
            : "none",
        }}
      >
        {isProcessing ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
        ) : (
          <>
            {tier.cta}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-500 group-hover/btn:translate-x-1"
              strokeWidth={1.6}
            />
          </>
        )}
      </button>
    </article>
  )
}

// ──────────────────────────────────────────────────────────────
// Upsell modal

function UpsellModal({
  eyebrow,
  title,
  titleItalic,
  body,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: {
  eyebrow: string
  title: string
  titleItalic: string
  body: string[]
  acceptLabel: string
  declineLabel: string
  onAccept: () => void
  onDecline: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain px-5 py-8 sm:px-8 animate-fade-in-up"
      style={{
        background: "color-mix(in srgb, var(--ink) 72%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-modal-title"
    >
      <div
        className="relative w-full max-w-lg rounded-md p-7 shadow-2xl sm:p-8"
        style={{
          background: "var(--card)",
          border: "1px solid color-mix(in srgb, var(--ink) 22%, transparent)",
          color: "var(--foreground)",
        }}
      >
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--signal), transparent)",
          }}
          aria-hidden
        />

        <p
          className="eyebrow mb-4 inline-flex items-center gap-3"
          style={{
            color: "color-mix(in srgb, var(--foreground) 75%, transparent)",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--signal)" }}
            aria-hidden
          />
          {eyebrow}
        </p>

        <h3
          id="upsell-modal-title"
          className="mb-5 font-serif text-[22px] leading-[1.18] text-ink sm:text-[26px]"
        >
          {title}
          <span className="block font-serif-italic text-foreground">
            {titleItalic}
          </span>
        </h3>

        <div className="mb-7 space-y-4 text-[15px] leading-[1.7] text-foreground/85">
          {body.map((p, i) => (
            <p key={i} className={i === body.length - 1 ? "text-ink" : ""}>
              {p}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onDecline}
            className="text-[12px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
          >
            {declineLabel}
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="s-btn group h-12 px-6 text-[12px]"
            style={{
              background: "var(--signal)",
              color: "var(--background)",
              border:
                "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
              boxShadow: "0 14px 40px -16px rgba(var(--glow), 0.55)",
            }}
          >
            {acceptLabel}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
              strokeWidth={1.6}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
