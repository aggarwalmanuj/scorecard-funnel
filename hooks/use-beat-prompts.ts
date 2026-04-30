"use client"

import { useState, useEffect } from "react"

export interface BeatDisplay {
  label: string
  title: string
  subtitle: string
  feedbackQuestion: string
}

type Audience = "individual" | "team"

const cache: Partial<Record<Audience, { beats: BeatDisplay[] | null; loaded: boolean }>> = {}

export function useBeatPrompt(
  audience: Audience | null,
  beatNumber: 1 | 2 | 3 | 4 | 5
): BeatDisplay | null | undefined {
  const [beat, setBeat] = useState<BeatDisplay | null | undefined>(() => {
    if (!audience) return undefined
    const c = cache[audience]
    if (!c?.loaded) return undefined
    return c.beats?.[beatNumber - 1] ?? null
  })

  useEffect(() => {
    if (!audience) {
      setBeat(undefined)
      return
    }
    const c = cache[audience]
    if (c?.loaded) {
      setBeat(c.beats?.[beatNumber - 1] ?? null)
      return
    }

    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/admin/question-prompts?audience=${audience}`)
        if (!res.ok) {
          if (!cancelled) {
            cache[audience!] = { beats: null, loaded: true }
            setBeat(null)
          }
          return
        }
        const json = await res.json()
        if (cancelled) return
        const beats =
          json.ok && Array.isArray(json.beats) ? (json.beats as BeatDisplay[]) : null
        cache[audience!] = { beats, loaded: true }
        setBeat(beats?.[beatNumber - 1] ?? null)
      } catch {
        if (!cancelled) {
          cache[audience!] = { beats: null, loaded: true }
          setBeat(null)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [audience, beatNumber])

  return beat
}
