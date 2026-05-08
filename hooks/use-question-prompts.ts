"use client"

import { useState, useEffect } from "react"

export interface QuestionPrompt {
  stageFraming: string
  question: string
  prompt: string
  hintBox: string
  placeholder: string
  quoteZone: string
}

type Audience = "individual" | "team"

// Module-level cache with a short TTL so:
//   1. Repeat hook calls inside one page render share a single fetch
//      (e.g. useQuestionPrompt and useBeatPrompt firing simultaneously).
//   2. Admin edits propagate to user pages within ~30 seconds without
//      a hard reload — the cache expires and the next render re-fetches.
//   3. Returning to the tab after backgrounding it always re-fetches,
//      catching the "admin updated content while user was away" case.
//
// Combined with `Cache-Control: private, no-store` on the API route, this
// keeps stale data out of the rendered UI while still de-duplicating the
// in-flight fetch storm that otherwise hits the server on each render.
const CACHE_TTL_MS = 30_000

type CacheEntry = {
  questions: QuestionPrompt[] | null
  fetchedAt: number
  inflight: Promise<QuestionPrompt[] | null> | null
}
const cache: Partial<Record<Audience, CacheEntry>> = {}

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
  return !!entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS
}

function clearCache() {
  for (const key of Object.keys(cache) as Audience[]) delete cache[key]
}

// Drop the cache when the tab regains focus — covers the case where an
// admin saved while the user was away. Registered exactly once per page
// load so we don't accumulate listeners as components mount/unmount.
if (typeof document !== "undefined") {
  let previouslyHidden = document.visibilityState === "hidden"
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && previouslyHidden) {
      clearCache()
    }
    previouslyHidden = document.visibilityState === "hidden"
  })
}

async function loadQuestions(audience: Audience): Promise<QuestionPrompt[] | null> {
  const existing = cache[audience]
  if (existing?.inflight) return existing.inflight
  if (isFresh(existing)) return existing.questions

  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/admin/question-prompts?audience=${audience}`,
        { cache: "no-store" },
      )
      if (!res.ok) return null
      const json = await res.json()
      return json.ok && Array.isArray(json.questions)
        ? (json.questions as QuestionPrompt[])
        : null
    } catch {
      return null
    }
  })()

  cache[audience] = { questions: null, fetchedAt: Date.now(), inflight: promise }
  const questions = await promise
  cache[audience] = { questions, fetchedAt: Date.now(), inflight: null }
  return questions
}

/**
 * Fetches audience-scoped question prompts.
 * Returns:
 *   - undefined while loading (so callers can render a skeleton)
 *   - null when keys are missing (admin hasn't seeded this audience yet)
 *   - QuestionPrompt object when found
 */
export function useQuestionPrompt(
  audience: Audience | null,
  questionNumber: 1 | 2 | 3 | 4 | 5
): QuestionPrompt | null | undefined {
  const [prompt, setPrompt] = useState<QuestionPrompt | null | undefined>(() => {
    if (!audience) return undefined
    const c = cache[audience]
    if (!isFresh(c)) return undefined
    return c.questions?.[questionNumber - 1] ?? null
  })

  useEffect(() => {
    if (!audience) {
      setPrompt(undefined)
      return
    }

    let cancelled = false
    void (async () => {
      const questions = await loadQuestions(audience)
      if (cancelled) return
      setPrompt(questions?.[questionNumber - 1] ?? null)
    })()

    return () => {
      cancelled = true
    }
  }, [audience, questionNumber])

  return prompt
}
