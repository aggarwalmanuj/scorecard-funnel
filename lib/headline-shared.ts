/**
 * Headline A/B shared contract — importable from middleware (edge), server
 * components, and client code alike. Keep this file dependency-free (no
 * posthog, no cosmos): it is the one place all three runtimes agree on.
 *
 * Assignment model (server-side, zero flicker):
 *   - middleware.ts owns assignment: it reads/sets the sticky cookie and
 *     rewrites `/` to the pre-rendered `/hl/[id]` variant page, so the
 *     visitor's first byte of HTML already contains their headline.
 *   - The client never resolves or swaps copy; it only mirrors the
 *     assignment (localStorage + PostHog super property) for attribution.
 */

export type HeadlineVariant = {
  id: string
  line1: string
  line2: string
}

/** Sticky assignment cookie, set by middleware on first visit. */
export const HEADLINE_COOKIE = "ufa_hl"

/** Default headline: served on `/` whenever the experiment is off, and the
 *  copy every variant page falls back to if its variant disappears. */
export const DEFAULT_HEADLINE: HeadlineVariant = {
  id: "default",
  line1: "You already know",
  line2: "there is more in you.",
}
