"use client"

import { useState, useEffect } from "react"
import {
  getFreshPrompts,
  loadPrompts,
  type BeatDisplay,
  type PromptAudience,
} from "@/lib/client/prompt-cache"

export type { BeatDisplay }

/**
 * Fetches audience-scoped beat display copy via the shared prompt cache —
 * the same bundle useQuestionPrompt reads, so navigating question → beat
 * within the TTL never refetches, and a mid-funnel reload re-renders from
 * localStorage instead of a skeleton. See lib/client/prompt-cache.ts.
 */
export function useBeatPrompt(
  audience: PromptAudience | null,
  beatNumber: 1 | 2 | 3 | 4 | 5
): BeatDisplay | null | undefined {
  const [beat, setBeat] = useState<BeatDisplay | null | undefined>(() => {
    if (!audience) return undefined
    const fresh = getFreshPrompts(audience)
    if (!fresh) return undefined
    return fresh.beats?.[beatNumber - 1] ?? null
  })

  useEffect(() => {
    if (!audience) {
      setBeat(undefined)
      return
    }

    let cancelled = false
    void (async () => {
      const bundle = await loadPrompts(audience)
      if (cancelled) return
      setBeat(bundle?.beats?.[beatNumber - 1] ?? null)
    })()

    return () => {
      cancelled = true
    }
  }, [audience, beatNumber])

  return beat
}
