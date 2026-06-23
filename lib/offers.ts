/**
 * The two "go deeper" offers shown to a Read The Pattern ($47) buyer - at the
 * end of their downloadable report and (later) anywhere else we want a single
 * source of truth for upsell copy + booking links. The full ladder (incl. the
 * $4,997 Elevated tier) lives on the offer screen; the report surfaces the two
 * primary next steps.
 *
 * Booking URLs come from the same NEXT_PUBLIC_CALENDLY_* env vars the offer
 * screen uses, so the booking team can rotate them without a code change.
 * When a Calendly URL isn't configured we fall back to the on-site offer page
 * (absolute, so links work inside a downloaded PDF that's opened offline).
 */

export type UpsellOfferId = "session" | "transformation"

export interface UpsellOffer {
  id: UpsellOfferId
  price: number
  label: string
  tagline: string
  bullets: string[]
}

export const UPSELL_OFFERS: UpsellOffer[] = [
  {
    id: "session",
    price: 497,
    label: "Hear Your Story",
    tagline: "Your first narrative - in your own voice.",
    bullets: [
      "Your first personalised narrative - your Purpose Story",
      "Built from your exact words and your actual life",
      "No call required - a structured submission at your own pace",
      "Yours permanently, credited toward the Protocol within 30 days",
    ],
  },
  {
    id: "transformation",
    price: 1997,
    label: "Believe Yourself",
    tagline: "Four weeks. Four stories. The shift that stays.",
    bullets: [
      "Everything in the Story Session",
      "One intake conversation with a trained practitioner",
      "Four personalised narratives - Purpose, Past, Future, Integration",
      "Midpoint check-in, integration session, and the 28-day Signal Wall",
      "Money-back guarantee",
    ],
  },
]

/** All four tiers. The offer screen and the in-report "go deeper" links both
 *  resolve to these Stripe Payment Links — single source of truth so they never
 *  drift apart. Hard-coded defaults work out of the box; override via env. */
export type Tier = "diagnostic" | "session" | "transformation" | "elevated"

export const STRIPE_PAYMENT_LINKS: Record<Tier, string> = {
  diagnostic:
    process.env.NEXT_PUBLIC_STRIPE_LINK_DIAGNOSTIC ??
    "https://buy.stripe.com/fZu4gz1mOd1K73O0ho2wU0m",
  session:
    process.env.NEXT_PUBLIC_STRIPE_LINK_SESSION ??
    "https://buy.stripe.com/7sYbJ1fdE0eYbk4e8e2wU0n",
  transformation:
    process.env.NEXT_PUBLIC_STRIPE_LINK_TRANSFORMATION ??
    "https://buy.stripe.com/8x2bJ1e9A3rabk45BI2wU0o",
  elevated:
    process.env.NEXT_PUBLIC_STRIPE_LINK_ELEVATED ??
    "https://buy.stripe.com/bJefZh8PgbXG0Fqd4a2wU0p",
}

/** Resolve the checkout URL for an upsell tier — the tier's Stripe Payment
 *  Link, with the funnel serial (client_reference_id) and email prefilled when
 *  available so the purchase still ties back to the user's row. */
export function offerBookingUrl(
  id: UpsellOfferId,
  opts?: { serialNumber?: number | null; email?: string }
): string {
  const base = STRIPE_PAYMENT_LINKS[id]
  try {
    const url = new URL(base)
    if (opts?.serialNumber != null)
      url.searchParams.set("client_reference_id", String(opts.serialNumber))
    if (opts?.email) url.searchParams.set("prefilled_email", opts.email)
    return url.toString()
  } catch {
    return base
  }
}
