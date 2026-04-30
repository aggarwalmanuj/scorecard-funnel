import { notFound } from "next/navigation"
import type { ReactNode } from "react"

export default async function AudienceLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ audience: string }>
}) {
  const { audience } = await params
  if (audience !== "individual" && audience !== "team") notFound()
  return <>{children}</>
}
