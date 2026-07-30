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

export type UpsellOfferId = "session" | "transformation" | "b2b_sprint"

export interface UpsellOffer {
  id: UpsellOfferId
  price: number
  label: string
  tagline: string
  bullets: string[]
}

export const UPSELL_OFFERS: UpsellOffer[] = [
  // Plain, optional descriptions (Funnel v2): no hype phrasing, no implied
  // outcomes - what it is, what you get, what it costs.
  {
    id: "session",
    price: 497,
    label: "Story Session",
    tagline: "One personalised narrative, written from your own words.",
    bullets: [
      "Your first personalised narrative - your Purpose Story",
      "Built from your exact words and your actual life",
      "No call required - a structured submission at your own pace",
      "Yours permanently, credited toward the Deep Work within 30 days",
    ],
  },
  {
    id: "transformation",
    price: 1997,
    label: "Four-Week Deep Work",
    tagline: "Four narratives over four weeks, with practitioner support.",
    bullets: [
      "Everything in the Story Session",
      "One intake conversation with a practitioner",
      "Four personalised narratives - Purpose, Past, Future, Integration",
      "Midpoint check-in, integration session, and the 28-day Signal Wall",
      "Money-back guarantee",
    ],
  },
]

/** All tiers. The offer screens and the in-report "go deeper" links both
 *  resolve to these Stripe Payment Links — single source of truth so they never
 *  drift apart. Hard-coded defaults work out of the box; override via env. */
export type Tier =
  | "diagnostic"
  | "session"
  | "transformation"
  | "elevated"
  | "b2b_actionplan"
  | "b2b_sprint"

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
  // Healthcare vertical: the $197 B2B Action Plan. NO hardcoded fallback —
  // a Payment Link must be created in Stripe and set via env before the
  // healthcare offer page can take money.
  b2b_actionplan:
    process.env.NEXT_PUBLIC_STRIPE_LINK_B2B_ACTIONPLAN ??
    "https://buy.stripe.com/00w00jfdE6Dm1Ju5BI2wU0q",
  // The B2B next rung: the Design Sprint. Priced at the bottom of the
  // strategy's $2.5K-$5K range and creditable toward a Vault engagement.
  b2b_sprint:
    process.env.NEXT_PUBLIC_STRIPE_LINK_B2B_SPRINT ??
    "https://buy.stripe.com/7sY7sLaXo8Lu3RCfci2wU0r",
}

/** The healthcare vertical's entry paid product (B2B conversion strategy:
 *  $197, corporate-card threshold, one-time, nothing recurring). */
export const B2B_ACTION_PLAN_PRICE = 197

/** The Sprint - the single rung the Action Plan is allowed to name. */
export const B2B_SPRINT_PRICE = 2500

/**
 * The B2B "go deeper" rung shown on the Action Plan's final page.
 *
 * Deliberately ONE offer, not a ladder: the strategy is explicit that each
 * rung sells only the next rung, and that the Vault is never sold from the
 * Action Plan. Register is operational - no consumer transformation
 * language, no urgency, and the creditable-toward mechanism stated plainly
 * so the step carries no sunk cost.
 */
const B2B_UPSELL: UpsellOffer[] = [
  {
    id: "b2b_sprint",
    price: B2B_SPRINT_PRICE,
    label: "Design Sprint",
    tagline: "The first working proof, built inside your systems.",
    bullets: [
      "We stop testing on paper and build the first working slice with your team",
      "Scoped to the single intervention point named in this Action Plan",
      "Runs against your real workflow - no new headcount, no platform migration",
      "Creditable toward a Vault engagement if you take that step later",
    ],
  },
]

/**
 * The in-report "go deeper" offers, per vertical. B2C verticals share the
 * two-tier consumer ladder; healthcare gets the single Sprint rung in its
 * own register.
 */
export function upsellOffersFor(vertical: string | null | undefined): UpsellOffer[] {
  if (vertical === "healthcare") return B2B_UPSELL
  return UPSELL_OFFERS
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
