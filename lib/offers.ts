/**
 * The two "go deeper" offers shown to a Diagnostic ($47) buyer — at the end
 * of their downloadable report and (later) anywhere else we want a single
 * source of truth for upsell copy + booking links.
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
    label: "Session + Report",
    tagline: "Find it. Move it. Walk away different.",
    bullets: [
      "60-minute session with an AI Merge trained expert",
      "Live exploration of your specific pattern",
      "A personalized narrative, delivered within 48 hours",
      "30-day follow-up check-in",
    ],
  },
  {
    id: "transformation",
    price: 997,
    label: "Deep Transformation",
    tagline: "The shift that stays — because you hear it every morning.",
    bullets: [
      "Everything in the Session package",
      "Extended 90-minute deep session",
      "Two personalized narratives — past-pattern release & future self",
      "30-day audio protocol in your own voice, for daily listening",
      "Two follow-up check-ins over 60 days",
    ],
  },
]

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")

/** Resolve the booking URL for an upsell tier. Prefers the Calendly env URL;
 *  falls back to the absolute on-site offer page for the given audience. */
export function offerBookingUrl(
  id: UpsellOfferId,
  audience?: string
): string {
  const env =
    id === "session"
      ? process.env.NEXT_PUBLIC_CALENDLY_SESSION_URL
      : process.env.NEXT_PUBLIC_CALENDLY_TRANSFORMATION_URL
  if (env && env.trim()) return env.trim()
  const aud = audience === "team" ? "team" : "individual"
  return `${SITE_URL}/challenge/${aud}/offer`
}
