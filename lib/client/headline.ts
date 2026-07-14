import type { HeadlineVariant } from "@/lib/headline-shared"

/**
 * Landing-headline A/B - client-side remnant.
 *
 * Assignment now happens ON THE SERVER: middleware picks a variant (sticky
 * `ufa_hl` cookie), rewrites `/` to the pre-rendered /hl/[id] page, and
 * counts the impression - the visitor's first byte of HTML already carries
 * their headline, with no skeleton and no client-side swap. The old
 * client-side resolve/prefetch/assign pipeline lives in git history.
 *
 * What remains here is the attribution mirror: <HeadlineSync> (mounted on
 * every variant page) writes the assignment to localStorage, and
 * getHeadlineAttribution() reads it back when the signup submits, stamping
 * headline_id + a text snapshot onto the user's Cosmos document. That's
 * what powers the per-variant funnel table in the admin.
 */

const STORAGE_KEY = "ufa_headline"

export type { HeadlineVariant }

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
