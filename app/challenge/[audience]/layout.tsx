import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { FunnelGuard } from "@/components/challenge/funnel-guard"

export default async function AudienceLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ audience: string }>
}) {
  const { audience } = await params
  if (audience !== "individual" && audience !== "team") notFound()
  return <FunnelGuard audience={audience}>{children}</FunnelGuard>
}
