import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Check, Shield } from "lucide-react"
import { STRIPE_PAYMENT_LINKS, type Tier } from "@/lib/offers"

const TRUST_LOGOS = [
  { src: "/logos/microsoft.png", alt: "Microsoft" },
  { src: "/logos/ibm.png", alt: "IBM" },
  { src: "/logos/tmobile.png", alt: "T-Mobile" },
  { src: "/logos/pearson.png", alt: "Pearson" },
] as const

/**
 * Standalone, UN-gated offer page. Unlike /challenge/[audience]/offer (which the
 * funnel guard locks behind a completed assessment), this route is reachable by
 * anyone — it's the exit-intent / "last chance" destination for visitors about
 * to bounce. Each tier links straight to its Stripe Payment Link.
 */
export const metadata: Metadata = {
  title: "Your Belief Score - Choose how deep you want to go",
  description:
    "Start with the full action plan, or go all the way. Read The Pattern, Hear Your Story, the four-week Protocol, or the full Elevated experience.",
  robots: { index: false, follow: false },
}

type OfferTier = {
  id: Tier
  price: string
  name: string
  blurb: string
  bullets: string[]
  cta: string
  featured?: boolean
}

const OFFER_TIERS: OfferTier[] = [
  {
    id: "diagnostic",
    price: "$47",
    name: "Read The Pattern",
    blurb: "Your full personalised action plan.",
    bullets: [
      "Built from your exact answers",
      "The specific pattern named in plain language",
      "Concrete next moves, specific to you",
    ],
    cta: "Get my action plan",
    featured: true,
  },
  {
    id: "session",
    price: "$497",
    name: "Hear Your Story",
    blurb: "Your first narrative - in your own voice.",
    bullets: [
      "Your Purpose Story, built from your life",
      "No call required - a structured submission",
      "Credited toward the Protocol within 30 days",
    ],
    cta: "Hear my story",
  },
  {
    id: "transformation",
    price: "$1,997",
    name: "Believe Yourself",
    blurb: "Four weeks. Four stories.",
    bullets: [
      "A practitioner intake + four narratives",
      "Midpoint and integration sessions",
      "28-day Signal Wall - money-back guarantee",
    ],
    cta: "Begin the Protocol",
  },
  {
    id: "elevated",
    price: "$4,997",
    name: "Build From That Belief",
    blurb: "Eight weeks, produced.",
    bullets: [
      "Everything in the Protocol, extended",
      "Professionally produced audio with music",
      "Direct practitioner access + a shareable legacy",
    ],
    cta: "Go Elevated",
  },
]

export default function OfferPage() {
  return (
    <div
      data-palette="marine"
      className="min-h-screen bg-background text-foreground font-sans"
    >
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-5 flex items-center justify-center gap-3 text-foreground/70">
            <span className="pulse-dot" aria-hidden />
            Before you go
          </p>
          <h1 className="font-serif text-[2rem] leading-[1.08] text-ink sm:text-[2.6rem]">
            Your pattern is waiting
            <span className="block font-serif-italic text-foreground">
              to be read back to you.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-[1.8] text-foreground/85 sm:text-base">
            Start with the full action plan at $47, or go as deep as you choose.
            Each step includes everything before it.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-md ring-1 ring-border">
          <div className="relative aspect-[21/9] w-full">
            <Image
              src="/images/offer-product.jpg"
              alt="A premium, minimalist workspace - the actionable intelligence your action plan delivers"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:items-stretch">
          {OFFER_TIERS.map((tier) => (
            <article
              key={tier.id}
              className={`group relative flex flex-col rounded-md p-7 ${
                tier.featured
                  ? "bg-[color-mix(in_srgb,var(--signal)_7%,var(--card))] ring-1 ring-[color-mix(in_srgb,var(--signal)_45%,transparent)]"
                  : "bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--ink)_18%,transparent)]"
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-signal px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-background">
                  Start here
                </span>
              )}
              <p
                className={`eyebrow mb-4 ${tier.featured ? "text-signal" : "text-foreground/70"}`}
              >
                {tier.name}
              </p>
              <div className="mb-1 flex items-baseline gap-1.5">
                <span className="font-serif text-[2.4rem] leading-none tabular-nums text-ink">
                  {tier.price}
                </span>
                <span className="font-serif-italic text-[13px] text-foreground/65">
                  one-time
                </span>
              </div>
              <p className="mb-5 font-serif-italic text-[15px] text-foreground/75">
                {tier.blurb}
              </p>
              <ul className="mb-7 flex-1 space-y-3">
                {tier.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${tier.featured ? "text-signal" : "text-foreground/60"}`}
                      strokeWidth={2}
                    />
                    <span className="text-[14px] leading-[1.6] text-foreground/85">
                      {b}
                    </span>
                  </li>
                ))}
              </ul>
              <a
                href={STRIPE_PAYMENT_LINKS[tier.id]}
                className="s-btn group/btn mt-auto h-12 w-full justify-center whitespace-nowrap text-[12px]"
                style={
                  tier.featured
                    ? {
                        background: "var(--signal)",
                        color: "var(--background)",
                        border:
                          "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
                      }
                    : undefined
                }
              >
                {tier.cta}
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-500 group-hover/btn:translate-x-1"
                  strokeWidth={1.6}
                />
              </a>
            </article>
          ))}
        </div>

        {/* Trust / authority strip - transactional credibility before handoff. */}
        <div className="mt-16 border-t border-border pt-10">
          <p className="eyebrow mb-7 text-center text-foreground/55">
            Built on work trusted by
          </p>
          <ul className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-12 gap-y-8">
            {TRUST_LOGOS.map((logo) => (
              <li key={logo.alt} className="relative h-8 w-24 sm:h-9">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  fill
                  sizes="120px"
                  className="object-contain opacity-55 grayscale"
                />
              </li>
            ))}
          </ul>
          <p className="mt-7 text-center font-serif-italic text-[13px] text-foreground/60">
            Peer-reviewed · Mensa Research Journal, Vol. 56, No. 2, 2025
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/60">
            <Shield className="h-3 w-3" strokeWidth={1.5} />
            Secure checkout · One-time payment
          </p>
          <Link
            href="/"
            className="text-[12px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
          >
            Not now - back to home
          </Link>
        </div>
      </main>
    </div>
  )
}
