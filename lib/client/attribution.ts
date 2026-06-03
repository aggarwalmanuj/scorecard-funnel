/**
 * First-touch acquisition attribution.
 *
 * UTM params and the referrer arrive on the *landing* URL (usually `/`), but
 * signup happens later on /challenge/audience — by then the query string is
 * gone. So we capture once, as early as possible at app boot (see
 * instrumentation-client.ts), and stash it in localStorage. submitSignup reads
 * it back and persists it onto the user document, where both /admin and
 * /techadmin surface it on each response.
 *
 * "First touch": we only write if nothing meaningful is stored yet, so the very
 * first campaign/referrer that brought the user in wins — a later same-browser
 * visit (e.g. a direct return) doesn't overwrite it.
 */

const STORAGE_KEY = "ufa_attribution"

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const

export type Attribution = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  referrer?: string
  landing_page?: string
}

const MAX_LEN = 500
const clamp = (v: string) => v.slice(0, MAX_LEN)

function hasMeaningfulSignal(a: Attribution): boolean {
  return Boolean(
    a.utm_source ||
      a.utm_medium ||
      a.utm_campaign ||
      a.utm_term ||
      a.utm_content ||
      a.referrer,
  )
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
    for (const key of UTM_KEYS) {
      const value = params.get(key)
      if (value) captured[key] = clamp(value)
    }
    // Only record an external referrer — same-origin navigations aren't
    // acquisition sources and would just be noise.
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
