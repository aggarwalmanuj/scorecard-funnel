/**
 * Readiness rules for the processing screen, extracted as pure functions so
 * the invariant that matters can be tested without mounting React.
 *
 * The invariant: THE FREE RESULT IS THE BEATS, THE SCORE AND THE SUMMARY.
 * Report generation is a heavier, separate call whose only reader (the Action
 * Plan screen) re-fetches it on demand. A participant who has completed the
 * assessment must never be held on /processing waiting for it.
 */

/** Minimum characters that count a beat as "delivered". */
export const BEAT_READY_MIN_CHARS = 40

export type ReadinessBeats = {
  beat1: string
  beat2: string
  beat3: string
  beat4: string
  beat5: string
}

export type ReadinessInput = {
  beats: ReadinessBeats
  hasClarityScore: boolean
  summaryText: string
}

function delivered(beat: string | undefined): boolean {
  return (beat?.trim().length ?? 0) >= BEAT_READY_MIN_CHARS
}

/** All five reflections have streamed enough text to be shown. */
export function beatsReady(beats: ReadinessBeats): boolean {
  return (
    delivered(beats.beat1) &&
    delivered(beats.beat2) &&
    delivered(beats.beat3) &&
    delivered(beats.beat4) &&
    delivered(beats.beat5)
  )
}

/**
 * Everything the reveal sequence and /summary actually render from.
 * Deliberately says nothing about reportData.
 */
export function coreResultReady(input: ReadinessInput): boolean {
  return (
    beatsReady(input.beats) &&
    input.hasClarityScore &&
    input.summaryText.trim().length > 0
  )
}

/**
 * The reveal sequence starts at beat-1, and lib/funnel-guard.ts sends /beat-1
 * back to /processing when beat-1 is short. Advancing without it would bounce
 * the participant between the two screens, remounting the processing screen
 * and resetting its timers on every pass - an effectively permanent freeze.
 */
export function canEnterReveal(beats: ReadinessBeats): boolean {
  return delivered(beats.beat1)
}

export type AdvanceFlags = {
  /** Core result plus the optional extras (summary audio, output writes). */
  allReady: boolean
  coreReady: boolean
  /** Core has been ready long enough that we stop waiting on the extras. */
  coreGraceElapsed: boolean
  /** The 75s blanket backstop. */
  timedOut: boolean
  /** The explicit "Continue anyway" button. */
  userForcedContinue: boolean
  canEnterReveal: boolean
}

/** Whether the processing screen should navigate to the reveal sequence. */
export function shouldAdvance(f: AdvanceFlags): boolean {
  if (!f.canEnterReveal) return false
  return (
    f.allReady ||
    (f.coreReady && f.coreGraceElapsed) ||
    f.timedOut ||
    f.userForcedContinue
  )
}

/**
 * Time has run out and there is still nothing to reveal. The caller shows a
 * recoverable error instead of spinning forever or bouncing off the guard.
 */
export function coreUnavailable(f: AdvanceFlags): boolean {
  return !f.canEnterReveal && (f.timedOut || f.userForcedContinue)
}
