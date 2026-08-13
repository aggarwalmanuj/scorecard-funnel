import { notFound } from "next/navigation"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { FunnelGuard } from "@/components/challenge/funnel-guard"
import { isVertical } from "@/lib/verticals"
import { displayFor } from "@/lib/vertical-display"

/**
 * Per-vertical metadata for the funnel.
 *
 * Every page under /challenge/[audience]/* is a client component, so none of
 * them can export metadata and all of them inherited the root layout's
 * "Your Belief Score | Find what's quietly limiting you". A parent taking the
 * Parenting Belief Score saw that generic title in their tab, in their history
 * and in anything they shared - the One-Name Law holds for the title too.
 *
 * This layout is the nearest server component to those pages, so it is where
 * the override belongs. `productName` is the vertical's single approved public
 * name (lib/vertical-display.ts); no new copy is invented here.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ audience: string }>
}): Promise<Metadata> {
  const { audience } = await params
  if (!isVertical(audience)) return {}
  const { productName } = displayFor(audience)

  return {
    // `absolute` so the root's "%s | Belief Score" template cannot append the
    // generic brand to a name that is already the product's full name.
    title: { absolute: productName },
    openGraph: { title: productName },
    twitter: { title: productName },
  }
}

export default async function AudienceLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ audience: string }>
}) {
  const { audience } = await params
  // Legacy segments ("individual" / "team") never reach here — middleware
  // 308-redirects them to /challenge/main/* before routing.
  if (!isVertical(audience)) notFound()
  return <FunnelGuard audience={audience}>{children}</FunnelGuard>
}
