import { AudienceEntryForm } from "@/components/challenge/audience-entry-form"
import { getEntryContent } from "@/lib/server/challenge-prompts"
import { DEFAULT_VERTICAL, normalizeVertical } from "@/lib/verticals"

/**
 * Funnel entry: the "your details" page every landing page hands off to.
 *
 * External vertical landing pages (ADHD, Retargeting, Healthcare) link here
 * with `?vertical=<id>` (plus their utm/ref params, captured separately by
 * lib/client/attribution.ts). The vertical is resolved SERVER-side and its
 * admin-authored entry copy is in the first byte of HTML - no client-side
 * content swap. No param (or an unknown one) means the main vertical, which
 * is what this site's own landing page sends.
 */

// Admin-edited copy must not be cached per-URL; the site is fully dynamic
// anyway (nonce CSP), this just makes it explicit.
export const dynamic = "force-dynamic"

function firstParam(v: string | string[] | undefined): string | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
}

export default async function AudienceEntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const vertical =
    normalizeVertical(
      firstParam(sp.vertical) ?? firstParam(sp.lp) ?? firstParam(sp.v),
    ) ?? DEFAULT_VERTICAL
  const content = await getEntryContent(vertical)
  return <AudienceEntryForm vertical={vertical} content={content} />
}
