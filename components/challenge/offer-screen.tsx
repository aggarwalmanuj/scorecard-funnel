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

type Tier = "diagnostic" | "session" | "transformation"

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
    label: "Diagnostic Report",
    headline: "Find the pattern.",
    headlineItalic: "Know the root cause.",
    included: [
      "Full PDF diagnostic report across all 7 pillars",
      "The specific pattern identified in plain language",
      "Three immediate behavioral shifts based on your results",
      "90-day benchmark score to measure progress",
    ],
    valueStatement:
      "Most people spend thousands on coaching that never identifies the root. This does — in a report you can read in 20 minutes.",
    cta: "Get My Report — $47",
  },
  {
    id: "session",
    price: 497,
    label: "Session + Report",
    headline: "Find it. Move it.",
    headlineItalic: "Walk away different.",
    included: [
      "Everything in the Diagnostic Report",
      "60-minute session with an AI Merge trained expert",
      "Live exploration of your specific pattern",
      "A personalized narrative generated from your session — delivered within 48 hours",
      "30-day follow-up check-in",
    ],
    valueStatement:
      "One session finds and moves the specific thing. Most people spend $500/month on support for years without this precision. This is the better investment.",
    cta: "Book My Session — $497",
    featured: true,
  },
  {
    id: "transformation",
    price: 997,
    label: "Deep Transformation",
    headline: "The shift that stays —",
    headlineItalic: "because you hear it every morning.",
    included: [
      "Everything in the Session package",
      "Extended 90-minute deep session",
      "Two personalized narratives — past pattern release and future self",
      "30-day audio protocol: your stories in your own voice, for daily listening",
      "Two follow-up check-ins over 60 days",
      "Priority booking for future sessions",
    ],
    valueStatement:
      "Most interventions produce insight that fades within weeks. The 30-day audio protocol installs the shift permanently — because your own voice, in your own words, is the most powerful delivery mechanism for lasting change.",
    cta: "Start My Transformation — $997",
  },
]

type ModalKind = "none" | "upsell-1" | "upsell-2" | "contact"

// Integration targets. Diagnostic goes through Stripe — the
// price/product are resolved server-side from env at /api/stripe/checkout.
// Session/Transformation are paid + scheduled inside Calendly's hosted
// flow; Calendly URLs are read from NEXT_PUBLIC_* env vars so the
// booking team can rotate them without a code change.
//
// Required env vars:
//   NEXT_PUBLIC_CALENDLY_SESSION_URL          ($497 tier)
//   NEXT_PUBLIC_CALENDLY_TRANSFORMATION_URL   ($997 tier)
const TIER_INTEGRATION = {
  diagnostic: { type: "stripe" as const },
  session: {
    type: "calendly" as const,
    url: process.env.NEXT_PUBLIC_CALENDLY_SESSION_URL ?? "",
  },
  transformation: {
    type: "calendly" as const,
    url: process.env.NEXT_PUBLIC_CALENDLY_TRANSFORMATION_URL ?? "",
  },
}

export function OfferScreen({ audience }: { audience: Audience }) {
  const { state } = useChallenge()
  const [isProcessing, setIsProcessing] = useState(false)
  const [modal, setModal] = useState<ModalKind>("none")
  const [pendingTier, setPendingTier] = useState<Tier | null>(null)
  const [modalEmail, setModalEmail] = useState("")
  const [modalFirstName, setModalFirstName] = useState("")
  const [modalError, setModalError] = useState("")

  // The upsells are shown at most once per visit per the doc spec
  // ("Show ONCE … never show again"). Tracked in component state so
  // refreshes reset — that matches the intent: a single nudge per
  // purchase decision moment, not a hard never-again block.
  const [shownUpsell1, setShownUpsell1] = useState(false)
  const [shownUpsell2, setShownUpsell2] = useState(false)

  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())

  const startCheckout = async (
    email: string,
    firstName: string,
    tier: Tier,
  ) => {
    setIsProcessing(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: firstName || undefined,
          audience,
          tier,
        }),
      })
      const data = (await res.json()) as {
        checkoutUrl?: string
        error?: string
      }
      if (!res.ok || !data.checkoutUrl) {
        console.error("[stripe/checkout] failed", data)
        setModalError(
          data.error ?? "Could not start checkout. Please try again.",
        )
        setIsProcessing(false)
        return
      }
      window.location.assign(data.checkoutUrl)
    } catch (err) {
      console.error("[stripe/checkout] network error", err)
      setModalError("Network error. Please try again.")
      setIsProcessing(false)
    }
  }

  // The $47 Diagnostic Report is the only tier that goes through
  // Stripe. The $497 / $997 tiers book directly through Calendly
  // (Calendly's hosted booking page handles payment via its own
  // Stripe integration), so they skip our checkout entirely.
  const proceedToTier = (tier: Tier) => {
    if (tier === "diagnostic") {
      proceedToStripe(tier)
    } else {
      void openCalendly(tier)
    }
  }

  // $47 path — collect contact details (the Stripe price for $47
  // doesn't capture name on its own), then hand off to Stripe.
  const proceedToStripe = (tier: Tier) => {
    const email = state.email?.trim() ?? ""
    const firstName = state.firstName?.trim() ?? ""
    if (!isValidEmail(email) || !firstName) {
      setPendingTier(tier)
      setModalEmail(isValidEmail(email) ? email : "")
      setModalFirstName(firstName)
      setModalError("")
      setModal("contact")
      return
    }
    void startCheckout(email, firstName, tier)
  }

  // $497 / $997 path — Calendly hosts the booking + payment for
  // these tiers. We hand off directly to the PM-supplied tier URL
  // (no API round-trip needed). On successful booking, Calendly
  // redirects back to /challenge/thank-you?booked=1&tier=... so
  // the user lands on a coherent confirmation screen with their
  // diagnostic-report download. On cancel/close the user stays on
  // Calendly's domain — they can navigate back themselves via the
  // browser back button, which lands them back on this offer page.
  const openCalendly = (tier: Tier) => {
    const config = TIER_INTEGRATION[tier]
    if (config.type !== "calendly") return
    if (!config.url) {
      console.error(
        `[calendly] missing URL for tier "${tier}". Set NEXT_PUBLIC_CALENDLY_${
          tier === "session" ? "SESSION" : "TRANSFORMATION"
        }_URL in your environment.`,
      )
      setModal("contact")
      setModalError(
        "Booking is temporarily unavailable. Please try again shortly or email us.",
      )
      return
    }
    setPendingTier(tier)
    setIsProcessing(true)
    try {
      const url = new URL(config.url)
      url.searchParams.set("utm_source", "ai-merge-challenge")
      url.searchParams.set("utm_medium", tier)
      if (state.firstName) url.searchParams.set("name", state.firstName)
      if (state.email) url.searchParams.set("email", state.email)

      // Post-booking redirect — Calendly honors this on Standard
      // plans and above. On plans that ignore it, the user lands
      // on Calendly's own confirmation page (still fine — they
      // got the calendar invite by email).
      if (typeof window !== "undefined") {
        const redirect = new URL("/challenge/thank-you", window.location.origin)
        redirect.searchParams.set("booked", "1")
        redirect.searchParams.set("tier", tier)
        if (audience) redirect.searchParams.set("audience", audience)
        url.searchParams.set("redirect_url", redirect.toString())
      }

      window.location.assign(url.toString())
    } catch (err) {
      console.error("[calendly] failed to open", err)
      setIsProcessing(false)
      setModal("contact")
      setModalError("Could not open booking. Please try again.")
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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = modalEmail.trim()
    const firstName = modalFirstName.trim()
    if (!firstName) {
      setModalError("Please enter your first name.")
      return
    }
    if (!isValidEmail(email)) {
      setModalError("Please enter a valid email address.")
      return
    }
    if (!pendingTier) {
      setModalError("Something went wrong. Please pick an option again.")
      return
    }
    setModalError("")
    await startCheckout(email, firstName, pendingTier)
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

      {/* Compact decision header — leads with the title and subhead so
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
            All options include your full diagnostic report.
          </p>
        </div>
      </section>

      {/* The Offer — three tiers in a single decision moment.
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
          <div className="grid grid-cols-1 gap-6 md:gap-7 lg:grid-cols-3 lg:items-stretch">
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

      {/* Voices wall — keeps social proof between offer and exit */}
      <section
        aria-labelledby="offer-voices-heading"
        className="border-t border-border py-16 sm:py-20"
      >
        <div className="mx-auto mb-10 max-w-4xl px-6 sm:mb-12 sm:px-8">
          <p className="eyebrow mb-4 text-foreground/70">
            <span className="mr-3 inline-block h-px w-6 align-middle bg-foreground/40" />
            Voices from the reading
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
            Your reading is yours
            <span className="block font-serif-italic text-foreground">
              regardless.
            </span>
          </h3>

          <div className="mb-7 max-w-xl space-y-5 text-[16px] leading-[1.8] text-foreground/85">
            <p>What surfaced is not going anywhere.</p>
            <p className="text-foreground/75">
              The pattern you saw is now visible — and that visibility alone
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

      {/* Upsell screens — shown ONCE per tier per session, between
          tier selection and the payment handoff. Decline routes to
          the originally-selected tier's checkout. */}
      {modal === "upsell-1" && (
        <UpsellModal
          eyebrow="One more thing before you checkout"
          title="Most people who unlock the report"
          titleItalic="want to discuss what it reveals."
          body={[
            "Most people who unlock the report find they want to discuss what it reveals with an expert.",
            "For $450 more, you get a full 60-minute session plus a personalized narrative generated from it — delivered within 48 hours.",
            "That's $497 total instead of $47.",
          ]}
          acceptLabel="Yes, upgrade to $497"
          declineLabel="No thanks, just the report"
          onAccept={() => acceptUpsell("session")}
          onDecline={() => declineUpsell("diagnostic")}
        />
      )}

      {modal === "upsell-2" && (
        <UpsellModal
          eyebrow="Make the shift permanent"
          title="The session will move something."
          titleItalic="The audio protocol makes sure it stays moved."
          body={[
            "The session will move something. The 30-day audio protocol makes sure it stays moved.",
            "Add the Deep Transformation package for $500 more — including a 90-minute session, two personalized narratives, and 30 days of daily audio in your own voice.",
            "That's $997 total.",
          ]}
          acceptLabel="Yes, upgrade to $997"
          declineLabel="No thanks, keep my $497 session"
          onAccept={() => acceptUpsell("transformation")}
          onDecline={() => declineUpsell("session")}
        />
      )}

      {modal === "contact" && (
        <ContactModal
          firstName={modalFirstName}
          email={modalEmail}
          error={modalError}
          isProcessing={isProcessing}
          onFirstNameChange={setModalFirstName}
          onEmailChange={setModalEmail}
          onClose={() => {
            if (!isProcessing) setModal("none")
          }}
          onSubmit={handleContactSubmit}
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
          ${tier.price}
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
        className="s-btn group/btn mt-auto h-12 w-full justify-center text-[12px]"
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-5 py-8 sm:px-8 animate-fade-in-up"
      style={{
        background: "color-mix(in srgb, var(--ink) 72%, transparent)",
        backdropFilter: "blur(6px)",
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

// ──────────────────────────────────────────────────────────────
// Contact details modal (email + first name before Stripe)

function ContactModal({
  firstName,
  email,
  error,
  isProcessing,
  onFirstNameChange,
  onEmailChange,
  onClose,
  onSubmit,
}: {
  firstName: string
  email: string
  error: string
  isProcessing: boolean
  onFirstNameChange: (v: string) => void
  onEmailChange: (v: string) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5 sm:px-8 animate-fade-in-up"
      style={{
        background: "color-mix(in srgb, var(--ink) 70%, transparent)",
        backdropFilter: "blur(6px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md rounded-md p-7 shadow-2xl"
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
        <p className="eyebrow mb-4 inline-flex items-center gap-3 text-foreground/75">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--signal)" }}
            aria-hidden
          />
          Continue to checkout
        </p>
        <h3
          id="checkout-modal-title"
          className="mb-2 font-serif text-[22px] leading-snug text-ink sm:text-[24px]"
        >
          A couple of details
          <span className="block font-serif-italic text-foreground">
            before payment.
          </span>
        </h3>
        <p className="mb-6 text-[14px] leading-[1.7] text-foreground/75">
          We&apos;ll send your receipt and details here.
        </p>

        <label className="mb-4 block">
          <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-foreground/70">
            First name
          </span>
          <input
            type="text"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            autoFocus
            required
            disabled={isProcessing}
            className="w-full rounded-md bg-transparent px-4 py-3 font-serif text-[15px] text-ink outline-none transition-colors focus:border-[color:var(--signal)]"
            style={{
              border:
                "1px solid color-mix(in srgb, var(--ink) 22%, transparent)",
            }}
          />
        </label>

        <label className="mb-2 block">
          <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-foreground/70">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            disabled={isProcessing}
            className="w-full rounded-md bg-transparent px-4 py-3 font-serif text-[15px] text-ink outline-none transition-colors focus:border-[color:var(--signal)]"
            style={{
              border:
                "1px solid color-mix(in srgb, var(--ink) 22%, transparent)",
            }}
          />
        </label>

        {error && (
          <p
            className="mt-4 rounded-md px-3 py-2 text-[13px] leading-snug"
            style={{
              background:
                "color-mix(in srgb, var(--signal) 8%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--signal) 30%, transparent)",
              color: "var(--ink)",
            }}
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-7 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="text-[11px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="s-btn group ml-auto h-12 px-6 text-[12px]"
            style={{
              background: "var(--signal)",
              color: "var(--background)",
              border:
                "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
              boxShadow: "0 14px 40px -16px rgba(var(--glow), 0.55)",
            }}
          >
            {isProcessing ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
            ) : (
              <>
                Continue
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                  strokeWidth={1.6}
                />
              </>
            )}
          </button>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/55">
          <Shield className="h-3 w-3" strokeWidth={1.5} />
          Secure checkout · One-time payment
        </p>
      </form>
    </div>
  )
}

