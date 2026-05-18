import posthog from "posthog-js"

/**
 * PostHog client-side initialization (Next.js 15.3+ pattern).
 *
 * Runs once at app boot in the browser. We use the dated `defaults`
 * preset so PostHog enables the modern recommended bundle:
 *   - autocapture
 *   - SPA pageview + pageleave tracking (history_change)
 *   - session replay
 *   - web vitals
 *   - exception capture
 *
 * The project token is a public-by-design `phc_*` key (PostHog's docs
 * mandate `NEXT_PUBLIC_*` exposure), so client-side bundling is safe.
 *
 * Guards:
 *   - Skip if the token isn't set (preview/local without env vars).
 *   - Skip on the server — this file is client-only by Next convention,
 *     but the typeof check is defensive against accidental SSR imports.
 *   - Disable autocapture + replay on localhost so dev clicks don't
 *     pollute production funnels/replays.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST
const IS_DEV = process.env.NODE_ENV !== "production"

if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: "2026-01-30",
    // Force the initial pageview. The `2026-01-30` defaults set
    // `capture_pageview: 'history_change'`, which fires on SPA route
    // changes but in some Next.js boot orderings the very first load
    // is missed. Setting `true` guarantees a pageview on init AND on
    // history change.
    capture_pageview: true,
    // Persist via localStorage+cookie so identified users survive a
    // session drop. `memory` would lose the distinct_id on refresh.
    persistence: "localStorage+cookie",
    // Surface SDK logs in dev so "event captured" / "decide returned"
    // are visible in the browser console. Production stays quiet.
    debug: IS_DEV,
    loaded: (ph) => {
      // Defensive: if a previous build called `opt_out_capturing()`,
      // the "NO" flag is sticky in localStorage and silently blocks
      // every subsequent capture even after the code is removed.
      // Clear it on every boot.
      try {
        if (ph.has_opted_out_capturing()) ph.opt_in_capturing()
      } catch {
        /* older SDKs may not expose the helper */
      }
    },
  })
}
