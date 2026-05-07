"use client"

import { useState, useEffect } from "react"

export interface BeatDisplay {
  label: string
  title: string
  subtitle: string
  feedbackQuestion: string
}

type Audience = "individual" | "team"

// Mirror of the question-prompts hook: short module TTL + visibility
// invalidation so admin edits propagate to user pages within ~30s and
// always after a tab refocus. The HTTP route runs no-store so this is
// the only client-side cache layer between the user and the database.
const CACHE_TTL_MS = 30_000

type CacheEntry = {
  beats: BeatDisplay[] | null
  fetchedAt: number
  inflight: Promise<BeatDisplay[] | null> | null
}
const cache: Partial<Record<Audience, CacheEntry>> = {}

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
  return !!entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS
}

function clearCache() {
  for (const key of Object.keys(cache) as Audience[]) delete cache[key]
}

if (typeof document !== "undefined") {
  let previouslyHidden = document.visibilityState === "hidden"
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && previouslyHidden) {
      clearCache()
    }
    previouslyHidden = document.visibilityState === "hidden"
  })
}

async function loadBeats(audience: Audience): Promise<BeatDisplay[] | null> {
  const existing = cache[audience]
  if (existing?.inflight) return existing.inflight
  if (isFresh(existing)) return existing.beats

  const promise = (async () => {
    try {
      // Same endpoint as the question hook - it returns both `questions`
      // and `beats` in a single response. Reading the same URL means the
      // browser/server can reuse the same handler invocation on rapid
      // double-mount.
      const res = await fetch(
        `/api/admin/question-prompts?audience=${audience}`,
        { cache: "no-store" },
      )
      if (!res.ok) return null
      const json = await res.json()
      return json.ok && Array.isArray(json.beats)
        ? (json.beats as BeatDisplay[])
        : null
    } catch {
      return null
    }
  })()

  cache[audience] = { beats: null, fetchedAt: Date.now(), inflight: promise }
  const beats = await promise
  cache[audience] = { beats, fetchedAt: Date.now(), inflight: null }
  return beats
}

export function useBeatPrompt(
  audience: Audience | null,
  beatNumber: 1 | 2 | 3 | 4 | 5
): BeatDisplay | null | undefined {
  const [beat, setBeat] = useState<BeatDisplay | null | undefined>(() => {
    if (!audience) return undefined
    const c = cache[audience]
    if (!isFresh(c)) return undefined
    return c.beats?.[beatNumber - 1] ?? null
  })

  useEffect(() => {
    if (!audience) {
      setBeat(undefined)
      return
    }

    let cancelled = false
    void (async () => {
      const beats = await loadBeats(audience)
      if (cancelled) return
      setBeat(beats?.[beatNumber - 1] ?? null)
    })()

    return () => {
      cancelled = true
    }
  }, [audience, beatNumber])

  return beat
}
