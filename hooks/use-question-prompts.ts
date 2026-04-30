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

const cache: Partial<Record<Audience, { questions: QuestionPrompt[] | null; loaded: boolean }>> = {}

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
    if (!c?.loaded) return undefined
    return c.questions?.[questionNumber - 1] ?? null
  })

  useEffect(() => {
    if (!audience) {
      setPrompt(undefined)
      return
    }
    const c = cache[audience]
    if (c?.loaded) {
      setPrompt(c.questions?.[questionNumber - 1] ?? null)
      return
    }

    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/admin/question-prompts?audience=${audience}`)
        if (!res.ok) {
          if (!cancelled) {
            cache[audience!] = { questions: null, loaded: true }
            setPrompt(null)
          }
          return
        }
        const json = await res.json()
        if (cancelled) return
        const questions =
          json.ok && Array.isArray(json.questions) ? (json.questions as QuestionPrompt[]) : null
        cache[audience!] = { questions, loaded: true }
        setPrompt(questions?.[questionNumber - 1] ?? null)
      } catch {
        if (!cancelled) {
          cache[audience!] = { questions: null, loaded: true }
          setPrompt(null)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [audience, questionNumber])

  return prompt
}
