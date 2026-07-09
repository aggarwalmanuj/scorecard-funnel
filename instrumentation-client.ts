import posthog from "posthog-js"
import { captureAttribution } from "@/lib/client/attribution"
import { prefetchHeadlines } from "@/lib/client/headline"

// Capture first-touch acquisition attribution (utm_* / referrer) as early as
// possible at boot — the landing URL carries the query string that's gone by
// the time signup happens. Idempotent and independent of PostHog being on.
captureAttribution()

// Landing page only: start the headline A/B variant fetch NOW, before React
// hydrates, so the network round-trip overlaps hydration instead of running
// after it (the hero awaits this same in-flight promise). No-ops when the
// localStorage variant cache is still fresh.
if (typeof window !== "undefined" && window.location.pathname === "/") {
  prefetchHeadlines()
}

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

// True when the app is booting directly on an admin console URL. Used to
// prevent session replay from ever starting there (init-time), closing the
// brief window before the `loaded` callback could call stopSessionRecording().
const BOOTED_ON_ADMIN =
  typeof window !== "undefined" &&
  /^\/(admin|techadmin)(\/|$|\?)/.test(window.location.pathname)

if (typeof window !== "undefined" && POSTHOG_KEY && (!IS_DEV || POSTHOG_DEV_ENABLED)) {
  posthog.init(POSTHOG_KEY, {
    // Don't start session replay at all when booting on an admin route — the
    // recorder would otherwise capture a beat before `loaded` stops it. SPA
    // navigation into admin is handled by stopSessionRecording() in the admin
    // page effect.
    disable_session_recording: BOOTED_ON_ADMIN,
    // Belt-and-braces: drop ANY event whose send happens while the user is on
    // an admin route. The `loaded` callback below opts out of capture, but it
    // runs async — on a direct boot to /admin the forced initial pageview (and
    // early autocapture) could otherwise race it and land in PostHog. Same for
    // the brief SPA-navigation window before the admin page effect runs.
    before_send: (event) => {
      if (/^\/(admin|techadmin)(\/|$|\?)/.test(window.location.pathname)) {
        return null
      }
      return event
    },
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
    // Session replay input masking. The `2026-01-30` defaults turn on
    // `maskAllInputs: true`, which masks EVERY input value — the secure
    // default we want to keep. We override only the masked-value function
    // so exactly ONE field is revealed: the tester's first name (carrying
    // `data-ph-unmask="true"` / `#firstName` on the audience page). This
    // lets us identify which tester a replay belongs to without recording
    // any other PII — email, and every other input, stay fully masked.
    session_recording: {
      maskAllInputs: true,
      maskInputFn: (text: string, element?: HTMLElement) => {
        if (
          element?.getAttribute("data-ph-unmask") === "true" ||
          element?.id === "firstName"
        ) {
          return text
        }
        return "*".repeat(text.length)
      },
    },
    loaded: (ph) => {
      // Keep ALL PostHog capture off while the user is inside the admin
      // consoles (/admin, /techadmin) — our own team's sessions, not customer
      // behaviour, and recording them wastes replay quota and can capture
      // other testers' data on screen.
      //
      // NOTE: the `session_recording.urlBlocklist` init option does NOT work
      // client-side — the recorder reads its blocklist from PostHog's REMOTE
      // config, not the local init param, so setting it here is silently
      // ignored. Instead we stop replay explicitly with stopSessionRecording()
      // (definitive, tears down the active rrweb recorder) AND opt out of event
      // capture. Client-side navigation into/out of admin is handled by a
      // matching effect in the admin page.
      const onAdminRoute = /^\/(admin|techadmin)(\/|$|\?)/.test(
        window.location.pathname
      )
      try {
        if (onAdminRoute) {
          ph.stopSessionRecording()
          ph.opt_out_capturing()
        } else if (ph.has_opted_out_capturing()) {
          // Defensive: `opt_out_capturing()` sets a sticky "NO" flag in
          // localStorage that silently blocks all future capture. Clear it
          // whenever we boot on a non-admin route (e.g. an admin left the
          // tab opted-out, then a customer opens the funnel in the same
          // browser).
          ph.opt_in_capturing()
        }
      } catch {
        /* older SDKs may not expose these helpers */
      }
    },
  })
}
