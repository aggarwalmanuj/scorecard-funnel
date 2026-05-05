"use client"

import { useEffect } from "react"
import { initClarity } from "@/lib/clarity"

/**
 * Mounts once at the body level via app/layout.tsx. The projectId is
 * read server-side from process.env and threaded through as a prop so
 * the env var never appears in the client bundle as NEXT_PUBLIC_*.
 *
 * Renders no UI — fire-and-forget init. If the env var isn't set, this
 * is a no-op (so dev/preview environments don't pollute Clarity's
 * recordings panel with localhost noise).
 */
export default function ClarityInit({ projectId }: { projectId: string }) {
  useEffect(() => {
    if (!projectId) return
    void initClarity(projectId)
  }, [projectId])
  return null
}
