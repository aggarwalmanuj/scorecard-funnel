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
// Dev clicks should not pollute production funnels / replays, AND many dev
// boxes (Windows + corporate networks) can't reach us.i.posthog.com from
// the browser, which produces an endless stream of `TypeError: Failed to
// fetch` in the terminal. So in dev we skip init entirely unless the
// developer explicitly opts in via NEXT_PUBLIC_POSTHOG_ENABLE_DEV=true.
const POSTHOG_DEV_ENABLED =
  process.env.NEXT_PUBLIC_POSTHOG_ENABLE_DEV === "true"

if (typeof window !== "undefined" && POSTHOG_KEY && (!IS_DEV || POSTHOG_DEV_ENABLED)) {
  posthog.init(POSTHOG_KEY, {
    // Route ALL PostHog traffic (events, feature flags, lazy-loaded
    // chunks) through our same-origin `/ingest` reverse proxy defined in
    // next.config.mjs. This is what makes ad/tracker blockers (uBlock,
    // Brave Shields, AdGuard, EasyList) treat the requests as first-party
    // and let them through. Note: even in dev, the proxy hops via the
    // Next.js dev server's Node process to PostHog — so a dev box that
    // can't reach us.i.posthog.com from Node (Windows + corporate
    // firewall) will see proxied requests fail. The
    // NEXT_PUBLIC_POSTHOG_ENABLE_DEV env var above gates whether init
    // runs in dev at all, so that environment can opt out cleanly.
    api_host: "/ingest",
    // ui_host is used ONLY for toolbar/debug "Open in PostHog" links and
    // must stay as the canonical dashboard host so they resolve. Keep
    // this pointing at the original NEXT_PUBLIC_POSTHOG_HOST value — do
    // not route it through the proxy.
    ui_host: POSTHOG_HOST,
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
