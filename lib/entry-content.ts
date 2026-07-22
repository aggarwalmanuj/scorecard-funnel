/**
 * Entry-page ("your details" signup step) content pack — the static,
 * admin-authored copy that varies per vertical. Stored in Cosmos as one JSON
 * blob per vertical under `entry_content_<vertical>`, edited on /admin, and
 * resolved server-side with the same inherit-from-main chain as prompts
 * (getEntryContent in lib/server/challenge-prompts.ts).
 *
 * Nothing here is ever AI-generated: this is deterministic, reviewed copy.
 * The defaults below mirror the pre-verticals hardcoded page so the funnel
 * renders correctly before any admin has saved a pack.
 */

export interface EntryContent {
  /** Small uppercase kicker above the headline, e.g. "I · Your details". */
  eyebrow: string
  /** First (roman) headline line. */
  headline: string
  /** Second (italic accent) headline line. */
  headlineAccent: string
  /** Paragraph under the headline. */
  subcopy: string
  /** CTA button label. */
  ctaLabel: string
  /** Show the founder orientation video below the form. */
  showVideo: boolean
}

export const DEFAULT_ENTRY_CONTENT: EntryContent = {
  eyebrow: "I · Your details",
  headline: "A few details,",
  headlineAccent: "then your five questions.",
  subcopy:
    "Your score and action plan are sent to the email you provide. A phone number is optional - only if you'd like a personal follow-up on WhatsApp.",
  ctaLabel: "Get your free score",
  showVideo: true,
}

/**
 * Merge a stored (possibly partial / malformed) pack over a base. Empty or
 * wrong-typed fields fall back per-field, which is how a vertical inherits
 * main's entry copy: pass main's resolved pack as `base` and only the
 * fields the vertical actually overrode take effect.
 */
export function mergeEntryContent(
  raw: unknown,
  base: EntryContent = DEFAULT_ENTRY_CONTENT
): EntryContent {
  if (!raw || typeof raw !== "object") return base
  const p = raw as Partial<EntryContent>
  const str = (v: unknown, d: string) =>
    typeof v === "string" && v.trim() !== "" ? v : d
  return {
    eyebrow: str(p.eyebrow, base.eyebrow),
    headline: str(p.headline, base.headline),
    headlineAccent: str(p.headlineAccent, base.headlineAccent),
    subcopy: str(p.subcopy, base.subcopy),
    ctaLabel: str(p.ctaLabel, base.ctaLabel),
    showVideo: typeof p.showVideo === "boolean" ? p.showVideo : base.showVideo,
  }
}
