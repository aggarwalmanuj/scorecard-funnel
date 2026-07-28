"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, ArrowLeft, Check, Shield } from "lucide-react"
import { useChallenge, type Audience } from "@/context/challenge-context"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import { ChallengeMenuButton } from "@/components/challenge/challenge-funnel-header-actions"
import { extractQuotedMoment } from "@/components/challenge/offer-screen"
import posthog from "posthog-js"
import { track } from "@/lib/fbpixel"
import { B2B_ACTION_PLAN_PRICE, STRIPE_PAYMENT_LINKS } from "@/lib/offers"
import { displayFor } from "@/lib/vertical-display"

/**
 * The B2B ($197) offer page, used by the healthcare vertical. Built from
 * the B2B Belief Score Conversion Strategy (Part 8.2) and the doorway
 * artifacts. It is deliberately a DIFFERENT page from the B2C offer, not a
 * re-skin, because the buyer risk is different: this person is spending
 * credibility, not money. The register rules are absolute:
 *
 *  - Deliverable bullets are falsifiable and identical to what the Action
 *    Plan actually contains (promise-to-delivery map).
 *  - "Deliverable, not a doorway": no consulting ambush, nobody calls.
 *  - The validity concession ("built from one leader's account, designed
 *    to be tested") appears here too - the objection re-arises at every ask.
 *  - Governance block: what's collected, no-PHI instruction, human review
 *    disclosed, deletion path.
 *  - NO testimonials (none exist for this product yet - the evidence-moment
 *    pipeline manufactures them ethically later), NO urgency, NO discounts,
 *    NO psychology vocabulary anywhere.
 */

const DELIVERABLES = [
  {
    title: "An executive summary",
    body: "The operating pattern, stated plainly for leadership and stakeholders.",
  },
  {
    title: "A leadership briefing",
    body: "A one-page version built to be shared upstream, so you don't have to translate this for your executive team.",
  },
  {
    title: "The operating-loop map",
    body: "Where the moment you described happens, step by step - and where it could stop.",
  },
  {
    title: "One intervention point",
    body: "A single, specific place to act. Not a transformation roadmap - one point, chosen to be testable.",
  },
  {
    title: "A stakeholder map and governance requirements",
    body: "Who is involved (roles, not names) and what responsible implementation would require.",
  },
  {
    title: "One bounded first-proof opportunity",
    body: "A measurable test designed to fit inside 30 days without new headcount, with an evidence plan and tracker.",
  },
] as const

const FAQ = [
  {
    q: "How is this different from the free Belief Profile?",
    a: "The Profile shows the operating assumption your account implies. The Action Plan turns it into a governed next step: the loop mapped, one intervention point, a stakeholder and governance view, and a bounded 30-day test with an evidence plan - plus the one-page leadership briefing.",
  },
  {
    q: "Is this a consulting engagement?",
    a: "No. This is a deliverable, not a doorway to a pitch. Nothing is bundled, nobody calls you, and implementation - if it ever makes sense - is a separate decision you would make later.",
  },
  {
    q: "What if leadership doesn't find it useful?",
    a: `If your leadership team doesn't find this a credible, usable next step, one email within 30 days gets a full refund - no questions, no exit interview. And you keep the Action Plan either way.`,
  },
] as const

export function B2BOfferScreen({ audience }: { audience: Audience }) {
  const { state } = useChallenge()
  const [isProcessing, setIsProcessing] = useState(false)
  const quotedMoment = extractQuotedMoment(state.responses.question1 ?? "")
  const display = displayFor(audience)
  const link = STRIPE_PAYMENT_LINKS.b2b_actionplan
  const checkoutReady = link !== ""

  const proceedToCheckout = () => {
    if (!checkoutReady) {
      console.error(
        '[stripe] no payment link configured for tier "b2b_actionplan" - set NEXT_PUBLIC_STRIPE_LINK_B2B_ACTIONPLAN'
      )
      return
    }
    track("InitiateCheckout", {
      value: B2B_ACTION_PLAN_PRICE,
      currency: "USD",
      content_name: "unfair-advantage-b2b-actionplan",
    })
    try {
      posthog.capture("checkout_start", { price: B2B_ACTION_PLAN_PRICE, vertical: audience })
    } catch {
      /* posthog not initialized (dev without token) */
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
      disabled={isProcessing || !checkoutReady}
      title={checkoutReady ? undefined : "Checkout not configured yet for this product"}
      className="s-btn group h-13 w-full justify-center px-7 text-[12.5px] sm:w-auto disabled:opacity-60"
      style={{
        background: "var(--signal)",
        color: "var(--background)",
        border: "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
        boxShadow: "0 14px 40px -16px rgba(var(--glow), 0.55)",
      }}
    >
      {isProcessing ? "Opening secure checkout…" : `Get Your ${display.reportName}`}
      {!isProcessing && (
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
          strokeWidth={1.6}
        />
      )}
    </button>
  )

  return (
    <div className="min-h-screen pb-24 sm:pb-20">
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

      {/* 1. Result bridge */}
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
            VIII · From profile to plan
          </p>

          <h1 className="mb-5 font-serif text-[1.7rem] leading-[1.1] text-ink sm:text-[2rem] sm:leading-[1.06] md:text-[2.4rem]">
            Your Belief Profile shows the operating assumption.
            <span className="block font-serif-italic text-foreground">
              The Action Plan shows what to do inside it.
            </span>
          </h1>

          {quotedMoment && (
            <blockquote className="mb-5 max-w-xl border-l border-foreground/40 pl-5 font-serif-italic text-[16px] leading-[1.6] text-foreground/80 sm:text-[17px]">
              &ldquo;{quotedMoment}&rdquo;
              <span className="mt-1 block text-[11px] font-sans not-italic uppercase tracking-[0.2em] text-foreground/50">
                The operating moment you described
              </span>
            </blockquote>
          )}

          <p className="max-w-xl text-[15.5px] leading-[1.8] text-foreground/80 sm:text-[16.5px]">
            Seeing the assumption clearly is real progress. But the same
            moment will come back. Your Action Plan turns this result into a
            governed, bounded next step - built from the exact operating
            moment you described, and designed to be tested, not taken on
            faith.
          </p>
        </div>
      </section>

      {/* 2. The product */}
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
              ${B2B_ACTION_PLAN_PRICE}
            </span>
          </div>
          <h2 className="font-serif text-[26px] leading-[1.12] text-ink sm:text-[32px]">
            Healthcare Operations
            <span className="block font-serif-italic text-foreground">
              Action Plan
            </span>
          </h2>

          <p className="mt-5 max-w-xl text-[15px] leading-[1.75] text-foreground/75">
            Built from the operating moment you described. Your Action Plan
            arrives within minutes. Reading it takes fifteen. The first-proof
            opportunity is designed to fit inside 30 days without new
            headcount.
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

          {/* The validity concession - the register-defining sentence. */}
          <div className="mt-9 rounded-md border border-border bg-background/60 p-5 sm:p-6">
            <p className="eyebrow mb-2 text-foreground/60">Built to be tested</p>
            <p className="text-[14px] leading-[1.75] text-foreground/75">
              This Action Plan is built from one leader&apos;s account. It is
              a hypothesis to test against the organization, not a finding
              about it - the bounded first-proof exists to test it cheaply.
              An operating assumption, here, means something specific: a rule
              the organization repeatedly acts as though true - visible in
              workflows, ownership, and escalation. This is not psychology,
              and it is not an audit or certification.
            </p>
          </div>

          {/* Deliverable, not a doorway (Fear 4) */}
          <p className="mt-8 max-w-xl text-[15px] leading-[1.8] text-foreground/80">
            This is a deliverable, not a doorway to a pitch. Implementation,
            if it ever makes sense, is a separate decision you would make
            later - nothing is bundled, and nobody calls you.
          </p>

          <p className="mt-6 text-[13.5px] leading-[1.7] text-foreground/65">
            Based on AI Merge, a peer-reviewed methodology published in the
            Mensa Research Journal.
          </p>

          {/* Price lockup + CTA - stated plainly; price integrity is
              register integrity in the B2B lane. */}
          <div className="mt-10 rounded-md border border-border bg-background/50 p-6 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div className="flex items-baseline gap-3">
                <span className="font-serif leading-none tabular-nums text-ink" style={{ fontSize: "clamp(52px, 8vw, 68px)" }}>
                  ${B2B_ACTION_PLAN_PRICE}
                </span>
                <span className="pb-1 text-[11px] uppercase tracking-[0.22em] text-foreground/60">
                  one-time
                </span>
              </div>
              <div className="pb-1.5 text-[13.5px] leading-[1.6] text-foreground/75">
                Inside personal card authority.
                <span className="block text-foreground/60">
                  Nothing recurring, nothing auto-renewing, no seat licenses.
                </span>
              </div>
            </div>
            <div className="mt-6">{ctaButton}</div>
            <p className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/60">
              <Shield className="h-3 w-3" strokeWidth={1.5} />
              Secure checkout · 30-day leadership-usefulness refund, one email
            </p>
          </div>
        </div>
      </section>

      {/* 3. FAQ */}
      <section className="px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow mb-8 text-foreground/70">Asked plainly</p>
          <dl className="space-y-7">
            {FAQ.map((o) => (
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

      {/* 4. Second ask */}
      <section className="border-t border-border px-5 py-14 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-4">
          <h3 className="font-serif text-[22px] leading-snug text-ink sm:text-[26px]">
            Turn the assumption you named
            <span className="block font-serif-italic text-foreground">
              into a bounded, testable next step.
            </span>
          </h3>
          {ctaButton}
        </div>
      </section>

      {/* 5. Exit */}
      <section className="bg-background px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow mb-6 text-foreground/70">
            IX · If now is not the right time
          </p>
          <h3 className="mb-7 font-serif text-[1.6rem] leading-[1.18] text-ink sm:text-[1.95rem] sm:leading-snug">
            Your Belief Profile is yours
            <span className="block font-serif-italic text-foreground">
              regardless.
            </span>
          </h3>
          <div className="mb-7 max-w-xl space-y-5 text-[16px] leading-[1.8] text-foreground/85">
            <p>The loop you described is now named, end to end.</p>
            <p className="text-foreground/75">
              What you do with the result stays entirely yours - and the
              option will be here if it becomes useful later.
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

      {/* Governance footer - the B2B equivalent of the B2C privacy line,
          never reused across registers (B2B strategy, Fear 2). */}
      <footer className="border-t border-border bg-background px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] leading-[1.7] text-foreground/55">
            What we collect: your free-text descriptions of operating
            moments. No patient data is requested, and none should be
            entered - do not include patient identifiers or protected health
            information. Your answers are used to build this organization&apos;s
            Profile and Action Plan only.
          </p>
          <p className="mt-3 text-[12px] leading-[1.7] text-foreground/55">
            A member of our team reviews each Action Plan for quality before
            it reaches you. Request deletion of your answers at any time by
            emailing feedback@tetranoodle.com.
          </p>
          <p className="mt-3 text-[12px] leading-[1.7] text-foreground/55">
            The Belief Profile and Action Plan are educational and reflective
            tools. They do not audit operations, finances, security, or
            compliance, and do not certify regulatory compliance.
          </p>
        </div>
      </footer>

      {/* Sticky buy bar - same affordance as the B2C page, in the B2B
          register: price stated plainly, no urgency, no hype. Self-disables
          while checkout isn't configured (see ctaButton). */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-8 sm:py-3.5">
        <div className="mx-auto flex max-w-5xl flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="hidden min-w-0 items-baseline gap-3 sm:flex">
            <span className="font-serif text-[26px] leading-none tabular-nums text-ink">
              ${B2B_ACTION_PLAN_PRICE}
            </span>
            <span className="truncate text-[11px] uppercase tracking-[0.18em] text-foreground/60">
              One-time · Nothing recurring · 30-day refund
            </span>
          </div>
          <button
            type="button"
            onClick={proceedToCheckout}
            disabled={isProcessing || !checkoutReady}
            title={checkoutReady ? undefined : "Checkout not configured yet for this product"}
            className="s-btn group h-12 w-full justify-center text-[12px] disabled:opacity-60 sm:h-11 sm:w-auto sm:shrink-0 sm:px-7"
            style={{
              background: "var(--signal)",
              color: "var(--background)",
              border: "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
            }}
          >
            {isProcessing
              ? "Opening secure checkout…"
              : `Get the Action Plan · $${B2B_ACTION_PLAN_PRICE}`}
          </button>
          <p className="text-center text-[9px] uppercase tracking-[0.18em] text-foreground/55 sm:hidden">
            One-time · Nothing recurring · 30-day refund
          </p>
        </div>
      </div>
    </div>
  )
}
