"use client"

import { useState, useEffect } from "react"
import {
  getFreshPrompts,
  loadPrompts,
  type PromptAudience,
  type QuestionPrompt,
} from "@/lib/client/prompt-cache"

export type { QuestionPrompt }

/**
 * Fetches audience-scoped question prompts via the shared prompt cache
 * (lib/client/prompt-cache.ts — localStorage + TTL + in-flight dedup +
 * stale-on-error, one bundle shared with useBeatPrompt so the same URL is
 * never fetched twice per page).
 *
 * Returns:
 *   - undefined while loading (so callers can render a skeleton)
 *   - null when keys are missing (admin hasn't seeded this audience yet)
 *   - QuestionPrompt object when found
 */
export function useQuestionPrompt(
  audience: PromptAudience | null,
  questionNumber: 1 | 2 | 3 | 4 | 5
): QuestionPrompt | null | undefined {
  const [prompt, setPrompt] = useState<QuestionPrompt | null | undefined>(() => {
    if (!audience) return undefined
    const fresh = getFreshPrompts(audience)
    if (!fresh) return undefined
    return fresh.questions?.[questionNumber - 1] ?? null
  })

  useEffect(() => {
    if (!audience) {
      setPrompt(undefined)
      return
    }

    let cancelled = false
    void (async () => {
      const bundle = await loadPrompts(audience)
      if (cancelled) return
      setPrompt(bundle?.questions?.[questionNumber - 1] ?? null)
    })()

    return () => {
      cancelled = true
    }
  }, [audience, questionNumber])

  return prompt
}
