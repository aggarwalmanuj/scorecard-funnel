"use client"

import { VERTICALS, type Vertical } from "@/lib/verticals"

/**
 * Client cache for the audience-scoped funnel copy (question prompts + beat
 * display copy), fetched together from /api/admin/question-prompts.
 *
 * Same caching architecture as lib/client/headline.ts, tuned for this data:
 *
 *  1. ONE cache entry per audience holds BOTH `questions` and `beats` — the
 *     two hooks used to keep separate module caches for the same URL, so
 *     every funnel page paid two identical fetches. Now the first hook to
 *     ask starts the request and the other awaits the same in-flight
 *     promise.
 *  2. The entry is persisted in localStorage with a freshness TTL, so a
 *     mid-funnel reload (or the browser evicting the tab on a low-memory
 *     phone) re-renders from cache instead of showing skeletons again.
 *     The TTL stays SHORT (30s, vs the headline's 5min) because admin edits
 *     to question copy must reach live testers quickly — that trade-off was
 *     deliberate in the original hooks and is preserved.
 *  3. A stale entry still beats a blank screen: if the fetch fails
 *     mid-funnel (flaky mobile connection), we serve the last good copy
 *     rather than the "content unavailable" path.
 *  4. `prefetchPrompts()` lets the audience page start the fetch the moment
 *     the visitor picks a path, so question-1 renders with copy already in
 *     hand instead of a skeleton.
 *
 * Tab-refocus invalidation (admin saved while the user was away) is kept
 * from the original hooks: refocus marks the entry expired — it will be
 * refetched next use — without deleting it, so it can still serve as the
 * stale fallback if that refetch fails.
 */

export interface QuestionPrompt {
  stageFraming: string
  question: string
  prompt: string
  hintBox: string
  placeholder: string
  quoteZone: string
}

export interface BeatDisplay {
  label: string
  title: string
  subtitle: string
  feedbackQuestion: string
}

export type PromptAudience = Vertical

export type PromptBundle = {
  questions: QuestionPrompt[] | null
  beats: BeatDisplay[] | null
}

const CACHE_TTL_MS = 30_000
const storageKey = (audience: PromptAudience) => `ufa_prompts_${audience}`

type CachedBundle = PromptBundle & { fetchedAt: number }

function readCached(audience: PromptAudience): CachedBundle | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(storageKey(audience))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedBundle
    return parsed && typeof parsed.fetchedAt === "number" ? parsed : null
  } catch {
    return null
  }
}

function writeCached(audience: PromptAudience, bundle: CachedBundle): void {
  try {
    window.localStorage.setItem(storageKey(audience), JSON.stringify(bundle))
  } catch {
    /* quota / privacy mode — the in-flight dedup still works */
  }
}

function isFresh(entry: CachedBundle | null): entry is CachedBundle {
  return !!entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS
}

// Refocus: expire (don't delete) so admin edits land on the next render,
// while the old copy remains available as the error fallback.
if (typeof document !== "undefined") {
  let previouslyHidden = document.visibilityState === "hidden"
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && previouslyHidden) {
      for (const audience of VERTICALS) {
        const entry = readCached(audience)
        if (entry) writeCached(audience, { ...entry, fetchedAt: 0 })
      }
    }
    previouslyHidden = document.visibilityState === "hidden"
  })
}

// Single in-flight fetch per audience, shared by both hooks and the
// prefetch — whichever runs first starts it, the others await it.
const inflight: Partial<Record<PromptAudience, Promise<PromptBundle | null>>> = {}

function fetchBundle(audience: PromptAudience): Promise<PromptBundle | null> {
  const existing = inflight[audience]
  if (existing) return existing
  const promise = (async () => {
    try {
      const res = await fetch(`/api/admin/question-prompts?audience=${audience}`, {
        cache: "no-store",
      })
      if (!res.ok) return null
      const json = await res.json()
      if (!json.ok) return null
      const bundle: PromptBundle = {
        questions: Array.isArray(json.questions)
          ? (json.questions as QuestionPrompt[])
          : null,
        beats: Array.isArray(json.beats) ? (json.beats as BeatDisplay[]) : null,
      }
      writeCached(audience, { ...bundle, fetchedAt: Date.now() })
      return bundle
    } catch {
      return null
    } finally {
      delete inflight[audience]
    }
  })()
  inflight[audience] = promise
  return promise
}

/** Fresh cached bundle, synchronously — lets hooks render real copy on
 *  first paint (no skeleton) when the data is already at hand. */
export function getFreshPrompts(audience: PromptAudience): PromptBundle | null {
  const cached = readCached(audience)
  return isFresh(cached) ? cached : null
}

/**
 * Resolve the prompt bundle: fresh cache → instant; otherwise await the
 * (possibly already in-flight) fetch; on failure fall back to the stale
 * cache so a flaky connection mid-funnel never blanks the copy.
 */
export async function loadPrompts(
  audience: PromptAudience,
): Promise<PromptBundle | null> {
  if (typeof window === "undefined") return null
  const cached = readCached(audience)
  if (isFresh(cached)) return cached
  const bundle = await fetchBundle(audience)
  if (bundle) return bundle
  return cached
}

/** Warm the cache ahead of navigation (e.g. the moment the visitor picks a
 *  path on the audience page) so question-1 renders without a skeleton.
 *  No-op while a fresh entry or an in-flight request exists. */
export function prefetchPrompts(audience: PromptAudience): void {
  if (typeof window === "undefined") return
  if (isFresh(readCached(audience))) return
  void fetchBundle(audience)
}
