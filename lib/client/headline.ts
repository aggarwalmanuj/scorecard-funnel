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
 * Latency design — three layers keep the hero skeleton as short as possible:
 *  1. `prefetchHeadlines()` is called from instrumentation-client.ts at app
 *     boot, BEFORE React hydrates, so the network round-trip overlaps
 *     hydration instead of running after it. `resolveHeadline()` awaits the
 *     same in-flight promise (never a second request).
 *  2. The active-variant list (INCLUDING the empty "experiment off" result)
 *     is cached in localStorage with a freshness TTL. While fresh, repeat
 *     visits resolve with zero network wait — for both the variant case and
 *     the default case — and skip the request entirely; once the TTL lapses
 *     the next boot's prefetch refreshes it. Admin edits therefore reach
 *     returning visitors within one TTL window (≤5 min).
 *  3. A stale cache still beats no data: on fetch failure we fall back to
 *     the stale list, then to the stored assignment, then to null (default).
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
const LIST_KEY = "ufa_headline_list"

// How long a cached variant list counts as fresh. Within this window repeat
// visits render without awaiting the network at all; the background
// revalidation still runs so an admin edit propagates one visit later.
const LIST_TTL_MS = 5 * 60_000

export type HeadlineVariant = {
  id: string
  line1: string
  line2: string
}

type CachedList = {
  headlines: HeadlineVariant[]
  fetchedAt: number
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

function writeStored(variant: HeadlineVariant): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(variant))
  } catch {
    /* quota — still serve the variant, just not sticky */
  }
}

function readCachedList(): CachedList | null {
  try {
    const raw = window.localStorage.getItem(LIST_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedList
    return parsed && Array.isArray(parsed.headlines) && typeof parsed.fetchedAt === "number"
      ? parsed
      : null
  } catch {
    return null
  }
}

function writeCachedList(headlines: HeadlineVariant[]): void {
  try {
    window.localStorage.setItem(
      LIST_KEY,
      JSON.stringify({ headlines, fetchedAt: Date.now() } satisfies CachedList),
    )
  } catch {
    /* quota */
  }
}

function registerSuperProperty(id: string): void {
  try {
    posthog.register({ headline_id: id })
  } catch {
    /* posthog not initialized (dev without token) */
  }
}

// Single in-flight fetch shared between the boot-time prefetch and
// resolveHeadline — whichever runs first starts it, the other awaits it.
let inflight: Promise<HeadlineVariant[] | null> | null = null

/** Fetch the active list, updating the localStorage cache on success.
 *  Returns null on failure (callers fall back to cached/stored data). */
function fetchActiveList(): Promise<HeadlineVariant[] | null> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch("/api/headlines")
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json()) as { headlines?: HeadlineVariant[] }
      const active = Array.isArray(json.headlines) ? json.headlines : []
      writeCachedList(active)
      return active
    } catch {
      return null
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/**
 * Kick off the variant fetch as early as possible (called from
 * instrumentation-client.ts at boot, before hydration). Skips the request
 * when the cached list is still fresh — the hero will resolve from cache.
 */
export function prefetchHeadlines(): void {
  if (typeof window === "undefined") return
  const cached = readCachedList()
  if (cached && Date.now() - cached.fetchedAt < LIST_TTL_MS) return
  void fetchActiveList()
}

/** Pick from an active list: keep the sticky assignment when still active
 *  (refreshing its text), otherwise assign uniformly at random + record the
 *  impression. Returns null when the list is empty (experiment off). */
function assignFrom(active: HeadlineVariant[]): HeadlineVariant | null {
  if (active.length === 0) return null

  const stored = readStored()
  const still = stored && active.find((h) => h.id === stored.id)
  if (still) {
    writeStored(still)
    registerSuperProperty(still.id)
    return still
  }

  const picked = active[Math.floor(Math.random() * active.length)]
  writeStored(picked)
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

/**
 * Resolve this visitor's headline variant. Returns null when the experiment
 * is off (no active variants / nothing recoverable) — caller renders the
 * default. Resolves synchronously-fast from the localStorage list cache when
 * fresh; otherwise awaits the (usually already in-flight) fetch.
 */
export async function resolveHeadline(): Promise<HeadlineVariant | null> {
  if (typeof window === "undefined") return null

  const cached = readCachedList()

  // Fresh cache: resolve immediately with no network wait. The boot-time
  // prefetch already skipped the request in this case; the cache expiring
  // (≤5 min) is what triggers the next revalidation.
  if (cached && Date.now() - cached.fetchedAt < LIST_TTL_MS) {
    return assignFrom(cached.headlines)
  }

  // No fresh cache: await the fetch (typically started at boot by
  // prefetchHeadlines, so most of it has already overlapped hydration).
  const active = await fetchActiveList()
  if (active) return assignFrom(active)

  // Fetch failed — degrade gracefully: a stale list is still a coherent
  // experiment state; failing that, honour a previous assignment so the
  // visitor at least sees consistent copy.
  if (cached) return assignFrom(cached.headlines)
  const stored = readStored()
  if (stored) registerSuperProperty(stored.id)
  return stored
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
