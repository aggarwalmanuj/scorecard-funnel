import posthog from "posthog-js"

/**
 * Landing-headline A/B assignment.
 *
 * The admin manages headline variants (CRUD in /admin → Headlines). When at
 * least one variant is active, each visitor is assigned one uniformly at
 * random; the assignment is sticky in localStorage so return visits (and the
 * signup that may happen minutes later) see the same copy. One impression is
 * recorded per NEW assignment, so the admin's "Visitors" column counts unique
 * assigned visitors, comparable across variants.
 *
 * The assignment also flows into the funnel:
 *  - `getHeadlineAttribution()` is merged into the signup attribution payload,
 *    stamping headline_id + a text snapshot onto the user's Cosmos document —
 *    that's what powers the per-variant funnel table in the admin.
 *  - The id is registered as a PostHog super property (`headline_id`) so every
 *    captured event/pageview can be broken down by variant in PostHog too.
 *
 * With zero active variants the hero keeps its hardcoded default and nothing
 * is tracked — the experiment is simply off.
 */

const STORAGE_KEY = "ufa_headline"

export type HeadlineVariant = {
  id: string
  line1: string
  line2: string
}

/** The visitor's sticky assignment, if one exists (synchronous — lets the
 *  hero render the right copy on first paint of a repeat visit, no skeleton). */
export function getStoredHeadline(): HeadlineVariant | null {
  if (typeof window === "undefined") return null
  return readStored()
}

function readStored(): HeadlineVariant | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as HeadlineVariant
    return parsed && typeof parsed.id === "string" && typeof parsed.line1 === "string"
      ? parsed
      : null
  } catch {
    return null
  }
}

function registerSuperProperty(id: string): void {
  try {
    posthog.register({ headline_id: id })
  } catch {
    /* posthog not initialized (dev without token) */
  }
}

/**
 * Resolve this visitor's headline variant. Returns null when the experiment
 * is off (no active variants / fetch failed) — caller renders the default.
 */
export async function resolveHeadline(): Promise<HeadlineVariant | null> {
  if (typeof window === "undefined") return null

  let active: HeadlineVariant[] = []
  try {
    const res = await fetch("/api/headlines")
    if (!res.ok) throw new Error(String(res.status))
    const json = (await res.json()) as { headlines?: HeadlineVariant[] }
    active = Array.isArray(json.headlines) ? json.headlines : []
  } catch {
    // Network/API failure: honour a previous assignment so the visitor at
    // least sees consistent copy; otherwise fall back to the default.
    const stored = readStored()
    if (stored) registerSuperProperty(stored.id)
    return stored
  }

  if (active.length === 0) return null

  // Sticky: keep the earlier assignment as long as that variant is still
  // active (refresh its text in case the admin reworded it).
  const stored = readStored()
  const still = stored && active.find((h) => h.id === stored.id)
  if (still) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(still))
    } catch {
      /* quota */
    }
    registerSuperProperty(still.id)
    return still
  }

  // New assignment: equal-probability split across active variants.
  const picked = active[Math.floor(Math.random() * active.length)]
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(picked))
  } catch {
    /* quota — still serve the variant, just not sticky */
  }
  registerSuperProperty(picked.id)

  // Count this unique visitor once, at assignment time. keepalive so an
  // immediate bounce still lands.
  fetch("/api/headlines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: picked.id }),
    keepalive: true,
  }).catch(() => {})

  return picked
}

/** The assignment as attribution fields for the signup payload (empty when
 *  the visitor never entered the experiment). */
export function getHeadlineAttribution(): {
  headline_id?: string
  headline_text?: string
} {
  if (typeof window === "undefined") return {}
  const stored = readStored()
  if (!stored) return {}
  return {
    headline_id: stored.id,
    headline_text: [stored.line1, stored.line2].filter(Boolean).join(" "),
  }
}
