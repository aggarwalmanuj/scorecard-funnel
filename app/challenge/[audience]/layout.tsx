import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { FunnelGuard } from "@/components/challenge/funnel-guard"
import { isVertical } from "@/lib/verticals"

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
