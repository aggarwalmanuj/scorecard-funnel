/**
 * Vertical registry — the single source of truth for every funnel vertical.
 *
 * A "vertical" is a self-contained flavour of the scorecard funnel: its own
 * entry-page copy, question/beat copy, and AI prompts, all keyed in Cosmos as
 * `<base>_<vertical>`. External landing pages route visitors into a vertical
 * by appending `?vertical=<id>` to the funnel entry URL, e.g.
 *   https://<site>/challenge/audience?vertical=adhd&utm_source=meta&ref=…
 *
 * Adding a vertical = add an entry to VERTICALS below, deploy, then seed its
 * content from the admin page. Until seeded, every key inherits from `main`
 * (see resolvePromptKey in lib/server/challenge-prompts.ts), so a brand-new
 * vertical runs the full funnel identically to main from day one.
 *
 * "main" replaced the old "individual" audience; "team" was retired entirely
 * (2026-07-22). Legacy ids are mapped via VERTICAL_ALIASES so mid-funnel
 * users, stored localStorage state, and old deep links keep working.
 */

export const VERTICALS = [
  "main",
  "retargeting",
  "adhd",
  "healthcare",
  "coaches",
] as const

export type Vertical = (typeof VERTICALS)[number]

export const DEFAULT_VERTICAL: Vertical = "main"

/** Human-readable labels for admin tabs, badges, and exports. */
export const VERTICAL_LABELS: Record<Vertical, string> = {
  main: "Main",
  retargeting: "Retargeting",
  adhd: "ADHD",
  healthcare: "Healthcare",
  coaches: "Coaches",
}

export function isVertical(v: unknown): v is Vertical {
  return typeof v === "string" && (VERTICALS as readonly string[]).includes(v)
}

/**
 * Alternate spellings accepted from URLs and legacy stored state, mapped to
 * their canonical id. Legacy audiences both collapse into "main".
 */
const VERTICAL_ALIASES: Record<string, Vertical> = {
  individual: "main",
  team: "main",
  "healthcare-automations": "healthcare",
  "healthcare-automation": "healthcare",
  retarget: "retargeting",
  // The B2B vertical's public identities all resolve to `healthcare`
  // (Healthcare Operations is its first ICP). `b2b-healthcare-ops` is the
  // slug the B2B landing page actually sends as `lp=`, and `healthcareops`
  // is its deployed subdomain - both MUST stay here or that traffic falls
  // through to the consumer funnel.
  business: "healthcare",
  b2b: "healthcare",
  "b2b-healthcare-ops": "healthcare",
  "healthcare-ops": "healthcare",
  healthcareops: "healthcare",
  // The Coaches and Consultants vertical. `coaches-consultants` is the slug
  // the coaches landing page actually sends as `lp=` (LP_SLUG in its
  // lib/scorecard.ts); `coaches` is its deployed subdomain and the canonical
  // id. Both MUST stay mapped or that paid traffic falls through to main and
  // runs the consumer funnel with consumer copy.
  "coaches-consultants": "coaches",
  "coaches-and-consultants": "coaches",
  "coach-consultant": "coaches",
  coach: "coaches",
  consultants: "coaches",
  consultant: "coaches",
}

/**
 * Resolve an arbitrary string (URL param, stored state, API payload) to a
 * canonical vertical id, or null when it matches nothing. Callers decide the
 * fallback — usually DEFAULT_VERTICAL.
 */
export function normalizeVertical(v: string | null | undefined): Vertical | null {
  if (!v) return null
  const lowered = v.trim().toLowerCase()
  if (isVertical(lowered)) return lowered
  return VERTICAL_ALIASES[lowered] ?? null
}

/**
 * Resolve a vertical from the request's Host header - each vertical has
 * its own subdomain as its public entry point:
 *   aimerge.live           -> main
 *   adhd.aimerge.live      -> adhd
 *   retarget.aimerge.live  -> retargeting
 *   business.aimerge.live  -> healthcare (the B2B lane)
 *   coaches.aimerge.live   -> coaches
 * The first host label is normalized through the alias table, so
 * retargeting./b2b. variants also work. Unknown or missing hosts (and
 * localhost, previews, www) resolve to null - callers fall back to other
 * signals (?vertical= param) and then to main.
 */
export function verticalFromHost(host: string | null | undefined): Vertical | null {
  if (!host) return null
  const name = host.split(":")[0].trim().toLowerCase()
  if (!name || name === "localhost" || /^[0-9.]+$/.test(name)) return null
  const label = name.split(".")[0]
  if (label === "www" || label === "aimerge") return null
  return normalizeVertical(label)
}
