import type { Audience, ChallengeState } from "@/context/challenge-context"

// Minimum chars that count a beat as "delivered." Mirrors BEAT_READY_MIN_CHARS
// in processing-screen.tsx — keep in sync so a partially-streamed beat doesn't
// satisfy the guard.
export const FUNNEL_MIN_BEAT_CHARS = 40

/**
 * Read at module-evaluation time (Next inlines NEXT_PUBLIC_* envs at build).
 * Defaults to "off" — production deployments must set the flag explicitly.
 */
export function isFunnelEnforced(): boolean {
  return process.env.NEXT_PUBLIC_ENFORCE_FUNNEL_ORDER === "true"
}

function hasIdentity(s: ChallengeState): boolean {
  return Boolean(s.email?.trim() && s.firstName?.trim() && s.audience)
}

function firstUnansweredQuestion(s: ChallengeState): number | null {
  for (let n = 1; n <= 5; n++) {
    const k = `question${n}` as keyof ChallengeState["responses"]
    if (!s.responses[k]?.trim()) return n
  }
  return null
}

function firstUnreachedBeat(s: ChallengeState): number | null {
  for (let n = 1; n <= 5; n++) {
    const k = `beat${n}` as keyof ChallengeState["beats"]
    if ((s.beats[k]?.trim().length ?? 0) < FUNNEL_MIN_BEAT_CHARS) return n
  }
  return null
}

/**
 * Returns the path the user should be at given their current state, or
 * `null` if the requested route is allowed.
 *
 * Redirects are *progressive*: a user missing question 2 is sent to
 * question-2, not deeper, so they can never skip ahead by manipulating
 * localStorage to set a later step's prerequisite.
 */
export function resolveFunnelRedirect(args: {
  pathname: string
  audience: Audience
  state: ChallengeState
}): string | null {
  const { pathname, audience, state } = args

  // Cross-audience leak: state holds "team" but URL says "individual"
  // (or vice-versa). Snap back to the state's audience so the two
  // halves of the funnel cannot be intermixed.
  if (state.audience && state.audience !== audience) {
    return `/challenge/${state.audience}/question-1`
  }

  const questionMatch = pathname.match(
    /^\/challenge\/(?:individual|team)\/question-([1-5])$/,
  )
  if (questionMatch) {
    if (!hasIdentity(state)) return "/challenge/audience"
    const n = Number(questionMatch[1])
    if (n === 1) return null
    const prev = `question${n - 1}` as keyof ChallengeState["responses"]
    if (!state.responses[prev]?.trim()) {
      const missing = firstUnansweredQuestion(state) ?? 1
      return `/challenge/${audience}/question-${missing}`
    }
    return null
  }

  if (/^\/challenge\/(?:individual|team)\/processing$/.test(pathname)) {
    if (!hasIdentity(state)) return "/challenge/audience"
    const missing = firstUnansweredQuestion(state)
    if (missing !== null) return `/challenge/${audience}/question-${missing}`
    return null
  }

  const beatMatch = pathname.match(
    /^\/challenge\/(?:individual|team)\/beat-([1-5])$/,
  )
  if (beatMatch) {
    if (!hasIdentity(state)) return "/challenge/audience"
    const missingQ = firstUnansweredQuestion(state)
    if (missingQ !== null) return `/challenge/${audience}/question-${missingQ}`

    const n = Number(beatMatch[1])
    if (n === 1) {
      // Beat-1 is only reachable after processing has produced content.
      if ((state.beats.beat1?.trim().length ?? 0) < FUNNEL_MIN_BEAT_CHARS) {
        return `/challenge/${audience}/processing`
      }
      return null
    }
    for (let i = 1; i < n; i++) {
      const k = `beat${i}` as keyof ChallengeState["beats"]
      if ((state.beats[k]?.trim().length ?? 0) < FUNNEL_MIN_BEAT_CHARS) {
        return `/challenge/${audience}/beat-${i}`
      }
    }
    return null
  }

  if (
    /^\/challenge\/(?:individual|team)\/(?:summary|offer)$/.test(pathname)
  ) {
    if (!hasIdentity(state)) return "/challenge/audience"
    const missingQ = firstUnansweredQuestion(state)
    if (missingQ !== null) return `/challenge/${audience}/question-${missingQ}`
    const missingB = firstUnreachedBeat(state)
    if (missingB !== null) return `/challenge/${audience}/beat-${missingB}`
    return null
  }

  // Anything else inside /challenge/[audience]/* that we don't recognise
  // is treated as open — fail-open rather than blocking by default so the
  // guard never accidentally locks out a route we forgot to enumerate.
  return null
}
