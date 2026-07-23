import { headers } from "next/headers"
import { AudienceEntryForm } from "@/components/challenge/audience-entry-form"
import { getEntryContent } from "@/lib/server/challenge-prompts"
import { DEFAULT_VERTICAL, normalizeVertical, verticalFromHost } from "@/lib/verticals"

/**
 * Funnel entry: the "your details" page every landing page hands off to.
 *
 * Vertical resolution, server-side, in priority order:
 *  1. `?vertical=<id>` query param - explicit override, used by external
 *     landing links and local testing (the dev switcher).
 *  2. The SUBDOMAIN - adhd.aimerge.live / retarget.aimerge.live /
 *     business.aimerge.live are the verticals' public entry points
 *     (middleware also forwards it as the x-vertical header).
 *  3. Main.
 * The resolved vertical's admin-authored entry copy is in the first byte
 * of HTML - no client-side content swap.
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
  const h = await headers()
  const vertical =
    normalizeVertical(
      firstParam(sp.vertical) ?? firstParam(sp.lp) ?? firstParam(sp.v),
    ) ??
    normalizeVertical(h.get("x-vertical")) ??
    verticalFromHost(h.get("host")) ??
    DEFAULT_VERTICAL
  const content = await getEntryContent(vertical)
  return <AudienceEntryForm vertical={vertical} content={content} />
}
