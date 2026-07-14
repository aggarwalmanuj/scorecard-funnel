import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { LandingPage } from "@/components/landing-minimal/landing-page"
import { HeadlineSync } from "@/components/landing-minimal/headline-sync"
import { isCosmosConfigured, listActiveHeadlines } from "@/lib/server/cosmos-db"

/**
 * Headline-variant landing pages. Visitors never see this URL: middleware
 * assigns a variant (sticky cookie) and REWRITES `/` here, so the address
 * bar stays `/` while the response HTML carries the assigned headline in
 * its first byte - no skeleton, no client-side swap.
 *
 * Rendering is dynamic, like every page on this site: the root layout
 * reads headers() for the CSP nonce, which opts the whole tree out of
 * static generation (attempting ISR here throws DYNAMIC_SERVER_USAGE).
 * That costs nothing relative to `/` before this change - it was equally
 * dynamic - and the active-variant lookup rides the in-instance cache in
 * cosmos-db, so Cosmos stays off the hot path.
 */

export const metadata: Metadata = {
  // Never let a variant URL compete with the canonical landing page.
  alternates: { canonical: "/" },
  robots: { index: false, follow: false },
}

export default async function HeadlineVariantPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!isCosmosConfigured()) notFound()

  const active = await listActiveHeadlines()
  const variant = active.find((h) => h.id === id)
  // Deactivated/deleted variants 404; middleware only rewrites to ids from
  // the current active list, so real visitors never land here. (Their next
  // request re-assigns from the live list.)
  if (!variant) notFound()

  return (
    <>
      <HeadlineSync variant={variant} />
      <LandingPage headline={variant} />
    </>
  )
}
