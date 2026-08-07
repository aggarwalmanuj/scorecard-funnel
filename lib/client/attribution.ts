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

import { normalizeVertical, verticalFromHost, type Vertical } from "@/lib/verticals"

/**
 * Attribution is namespaced PER VERTICAL.
 *
 * It used to be one global record, which meant the first campaign-grade
 * touch on a browser was attached to every later signup no matter which
 * funnel the person ran: someone who once visited the ADHD doorway and
 * later arrived through healthcareops.aimerge.live was still reported as
 * "utm_source=adhd, campaign=adhd-doorway". Marketing then reads a
 * healthcare lead as ADHD spend.
 *
 * Arriving at a vertical's doorway is a distinct acquisition into a
 * distinct product line, so first-touch is scoped to the vertical: first
 * touch WITHIN adhd, within healthcare, within main. Across verticals they
 * never contaminate each other.
 */
const LEGACY_STORAGE_KEY = "ufa_attribution"
const storageKeyFor = (v: Vertical) => `ufa_attribution:${v}`

/**
 * Which vertical this page view belongs to, using the same precedence the
 * server entry page uses: explicit param → subdomain → main.
 */
function currentVertical(): Vertical {
  if (typeof window === "undefined") return "main"
  try {
    const p = new URLSearchParams(window.location.search)
    return (
      normalizeVertical(p.get("vertical") ?? p.get("lp") ?? p.get("v")) ??
      verticalFromHost(window.location.hostname) ??
      "main"
    )
  } catch {
    return "main"
  }
}

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

// Cross-reference back to the originating landing page + which vertical/funnel
// the session came from:
//   ref      → the landing page's own lead/record id (JOIN key back to its DB)
//   lp       → which landing page forwarded the user (e.g. "adhd")
//   vertical → the funnel/vertical of the session (e.g. "adhd", "traders",
//              "main"). Alias of lp; whichever the landing page sends is used.
const REF_KEYS = ["ref", "lp", "vertical"] as const

const CAPTURE_KEYS = [...UTM_KEYS, ...CLICK_KEYS, ...REF_KEYS] as const

export type Attribution = Partial<
  Record<(typeof CAPTURE_KEYS)[number], string>
> & {
  referrer?: string
  landing_page?: string
}

const MAX_LEN = 500
const clamp = (v: string) => v.slice(0, MAX_LEN)

/**
 * The subset of CAPTURE_KEYS that is actual evidence of a campaign.
 *
 * `vertical` is deliberately EXCLUDED even though it is captured and stored.
 * It is self-stamped on every single capture below, so counting it as campaign
 * evidence made *every* record campaign-grade - including the record written
 * by a bare, param-less visit to the homepage. That record then satisfied the
 * "first touch is final" guard forever, so the real ad click a visitor made
 * days later was read and thrown away.
 *
 * Shipped in ee5ce9b (the vertical-namespacing change), which added the
 * unconditional `captured.vertical = vertical` stamp below without noticing
 * that `vertical` was already inside the campaign test. Observed live on
 * production rows #133 and #140: both stored exactly
 * `{ vertical: "main", landing_page: "/" }` and nothing else.
 */
const CAMPAIGN_KEYS = [...UTM_KEYS, ...CLICK_KEYS, "ref", "lp"] as const

/** Campaign-grade signal: explicit UTM tags, an ad click id, or a landing-page
 *  hand-off (ref/lp). A bare referrer is NOT campaign-grade, and neither is
 *  the self-stamped `vertical` - see CAMPAIGN_KEYS. */
function hasCampaignSignal(a: Attribution): boolean {
  return CAMPAIGN_KEYS.some((k) => a[k])
}

function hasMeaningfulSignal(a: Attribution): boolean {
  return Boolean(hasCampaignSignal(a) || a.referrer)
}

/**
 * Capture attribution from the current URL + referrer into localStorage.
 * Safe to call on every boot.
 *
 * "First touch" with one deliberate exception: a stored record that holds
 * ONLY a referrer (e.g. an organic search visit last week) is UPGRADED by a
 * later visit carrying real campaign data. Without that, an organic visit
 * would permanently mask the paid click that actually drove the signup —
 * the exact question the marketing team uses this data to answer. Once a
 * campaign record exists, first campaign wins and is never overwritten.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return
  try {
    const vertical = currentVertical()
    const STORAGE_KEY = storageKeyFor(vertical)
    const existingRaw = window.localStorage.getItem(STORAGE_KEY)
    if (existingRaw) {
      let existing: Attribution | null = null
      try {
        existing = JSON.parse(existingRaw) as Attribution
      } catch {
        existing = null
      }
      // A valid, campaign-grade first touch is final.
      if (existing && hasCampaignSignal(existing)) return
    }

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

    // Always stamp the vertical this touch belongs to, so a stored record
    // is self-describing and the admin's UTM block can never disagree with
    // the funnel the person actually ran. NOTE: this is why `vertical` must
    // stay out of CAMPAIGN_KEYS - see the comment there.
    captured.vertical = vertical

    // A param-less arrival is NOT recorded as an acquisition. There used to be
    // a block here that synthesised `utm_source: <vertical>, utm_medium:
    // "direct"` for non-main verticals, to stop another vertical's record
    // answering for this one - but namespacing the storage key per vertical
    // (storageKeyFor, above) already solves that, and the row itself carries
    // an `audience` column recording the doorway. All the synthetic marker did
    // was make a direct visit look campaign-grade, which re-created the exact
    // lock-out this file exists to avoid, one vertical at a time.
    if (!hasMeaningfulSignal(captured)) return
    // Don't downgrade a stored referrer-only record with another
    // referrer-only one - the first referrer still wins among equals.
    if (existingRaw && !hasCampaignSignal(captured)) return

    captured.landing_page = clamp(
      window.location.pathname + window.location.search,
    )
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(captured))
  } catch {
    /* localStorage blocked / SSR — attribution is best-effort */
  }
}

function readRecord(key: string): Attribution | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Attribution
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

/**
 * Read the first-touch attribution for the vertical being submitted.
 *
 * Pass the signup's vertical so a healthcare lead can never be credited to
 * an ADHD campaign the same browser saw weeks ago. The legacy single-key
 * record (written before attribution was namespaced) is honoured ONLY when
 * it belongs to the vertical being asked for - otherwise it is ignored,
 * which is exactly the contamination this replaced.
 */
export function getAttribution(vertical?: string | null): Attribution {
  if (typeof window === "undefined") return {}
  try {
    const v = normalizeVertical(vertical) ?? currentVertical()

    const scoped = readRecord(storageKeyFor(v))
    if (scoped) return scoped

    const legacy = readRecord(LEGACY_STORAGE_KEY)
    if (legacy) {
      const legacyVertical =
        normalizeVertical(legacy.vertical) ?? normalizeVertical(legacy.lp)
      // Unlabelled legacy records are only safe to claim for main.
      if (legacyVertical === v || (!legacyVertical && v === "main")) {
        return legacy
      }
    }
    return {}
  } catch {
    return {}
  }
}
