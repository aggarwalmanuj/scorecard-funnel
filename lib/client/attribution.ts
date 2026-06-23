/**
 * First-touch acquisition attribution.
 *
 * UTM params, ad-platform click IDs, and a cross-reference back to the
 * originating landing page arrive on the *landing* URL (usually `/` or
 * `/challenge/audience`), but signup happens later — by then the query string
 * is gone. So we capture once, as early as possible at app boot (see
 * instrumentation-client.ts), and stash it in localStorage. submitSignup reads
 * it back and persists it onto the user document, where both /admin and
 * /techadmin surface it on each response.
 *
 * Cross-funnel flow: external landing pages (run behind ads) store their own
 * utm/click-id/lead-id, then forward the user here with those values appended
 * to the redirect URL, e.g.
 *   https://aimerge.live/challenge/audience?utm_source=meta&utm_campaign=adhd-q3
 *     &fbclid=…&ref=<landing-db-lead-id>&lp=adhd
 * We capture them so a score on this site can be tied back to the exact lead
 * row (ref) and the platform that drove it (utm_source / click IDs).
 *
 * "First touch": we only write if nothing meaningful is stored yet, so the very
 * first campaign/referrer that brought the user in wins — a later same-browser
 * visit (e.g. a direct return) doesn't overwrite it.
 */

const STORAGE_KEY = "ufa_attribution"

// Standard UTM tags.
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const

// Ad-platform click identifiers — pinpoint the platform and enable
// conversion matching (Meta fbclid, Google gclid, TikTok ttclid, Microsoft).
const CLICK_KEYS = ["fbclid", "gclid", "ttclid", "msclkid"] as const

// Cross-reference back to the originating landing page:
//   ref → the landing page's own lead/record id (lets you JOIN a score on this
//         site to the exact row already stored in the landing page's DB)
//   lp  → which landing page / funnel forwarded the user (e.g. "adhd")
const REF_KEYS = ["ref", "lp"] as const

const CAPTURE_KEYS = [...UTM_KEYS, ...CLICK_KEYS, ...REF_KEYS] as const

export type Attribution = Partial<
  Record<(typeof CAPTURE_KEYS)[number], string>
> & {
  referrer?: string
  landing_page?: string
}

const MAX_LEN = 500
const clamp = (v: string) => v.slice(0, MAX_LEN)

function hasMeaningfulSignal(a: Attribution): boolean {
  return Boolean(CAPTURE_KEYS.some((k) => a[k]) || a.referrer)
}

/**
 * Capture attribution from the current URL + referrer into localStorage, once.
 * Safe to call on every boot — it no-ops if a first-touch record already exists
 * or if there's no meaningful signal (so a direct/no-referrer first visit
 * doesn't block a later campaign landing from being captured).
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return
  try {
    if (window.localStorage.getItem(STORAGE_KEY)) return

    const params = new URLSearchParams(window.location.search)
    const captured: Attribution = {}
    for (const key of CAPTURE_KEYS) {
      const value = params.get(key)
      if (value) captured[key] = clamp(value)
    }
    // Only record an external referrer — same-origin navigations aren't
    // acquisition sources and would just be noise. Note: landing pages that
    // set rel="noreferrer" / a strict Referrer-Policy won't send this, which is
    // exactly why we also rely on explicit utm/ref/lp params above.
    const ref = document.referrer
    if (ref) {
      try {
        if (new URL(ref).origin !== window.location.origin) {
          captured.referrer = clamp(ref)
        }
      } catch {
        captured.referrer = clamp(ref)
      }
    }

    if (!hasMeaningfulSignal(captured)) return

    captured.landing_page = clamp(
      window.location.pathname + window.location.search,
    )
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(captured))
  } catch {
    /* localStorage blocked / SSR — attribution is best-effort */
  }
}

/** Read the stored first-touch attribution (empty object if none). */
export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Attribution
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}
