// Run with: npm test
//
// Regression cover for the "stranded at 88%" incident (serial 163, 13 Aug 2026):
// a participant completed all five questions, the score, beats and summary all
// generated successfully, and the processing screen never released them because
// report generation had not produced `reportData`.

import { test } from "node:test"
import assert from "node:assert/strict"

import {
  BEAT_READY_MIN_CHARS,
  beatsReady,
  canEnterReveal,
  coreResultReady,
  coreUnavailable,
  shouldAdvance,
  type AdvanceFlags,
  type ReadinessBeats,
} from "./processing-readiness.ts"

import { FUNNEL_MIN_BEAT_CHARS } from "../funnel-guard.ts"

const beat = (n: number) => `Reflection ${n}: `.padEnd(BEAT_READY_MIN_CHARS + 20, "x")

const fullBeats = (): ReadinessBeats => ({
  beat1: beat(1),
  beat2: beat(2),
  beat3: beat(3),
  beat4: beat(4),
  beat5: beat(5),
})

const completedAssessment = () => ({
  beats: fullBeats(),
  hasClarityScore: true,
  summaryText: "What you described is not a failure of parenting.",
})

const flags = (over: Partial<AdvanceFlags> = {}): AdvanceFlags => ({
  allReady: false,
  coreReady: false,
  coreGraceElapsed: false,
  timedOut: false,
  userForcedContinue: false,
  canEnterReveal: true,
  ...over,
})

// ── The invariant this incident is about ───────────────────────────────────

test("a completed assessment is core-ready with no reportData anywhere in the input", () => {
  // The type itself is the assertion: there is no reportData field to supply.
  assert.equal(coreResultReady(completedAssessment()), true)
})

test("a completed assessment advances once the grace period elapses, without reportData", () => {
  const advanced = shouldAdvance(
    flags({ coreReady: true, coreGraceElapsed: true }),
  )
  assert.equal(advanced, true, "core result must release the participant on its own")
})

test("serial 163: score + 5 beats + summary present, report never returned -> not stranded", () => {
  const state = completedAssessment()
  assert.equal(coreResultReady(state), true)

  // Before the grace elapses we still wait a moment for the optional extras...
  assert.equal(
    shouldAdvance(flags({ coreReady: true, coreGraceElapsed: false })),
    false,
  )
  // ...but the wait is bounded, and is never conditional on a report.
  assert.equal(
    shouldAdvance(flags({ coreReady: true, coreGraceElapsed: true })),
    true,
  )
})

test("optional extras never veto a completed result", () => {
  // allReady false stands in for "summary audio failed" / "sheet writes hung".
  assert.equal(
    shouldAdvance(flags({ allReady: false, coreReady: true, coreGraceElapsed: true })),
    true,
  )
})

// ── Never advance into a guard bounce ──────────────────────────────────────

test("never advances without beat-1, even when the hard timeout fires", () => {
  assert.equal(
    shouldAdvance(flags({ timedOut: true, canEnterReveal: false })),
    false,
    "advancing here would bounce off funnel-guard and reset the timers forever",
  )
})

test("never advances without beat-1, even when the user forces continue", () => {
  assert.equal(
    shouldAdvance(flags({ userForcedContinue: true, canEnterReveal: false })),
    false,
  )
})

test("no beat-1 at the deadline surfaces a recoverable error instead", () => {
  assert.equal(coreUnavailable(flags({ timedOut: true, canEnterReveal: false })), true)
  assert.equal(coreUnavailable(flags({ userForcedContinue: true, canEnterReveal: false })), true)
})

test("a healthy run never reports core-unavailable", () => {
  assert.equal(
    coreUnavailable(flags({ coreReady: true, coreGraceElapsed: true, canEnterReveal: true })),
    false,
  )
})

// ── Escape hatches still work ──────────────────────────────────────────────

test("the 75s backstop still advances once beat-1 exists", () => {
  assert.equal(shouldAdvance(flags({ timedOut: true })), true)
})

test('"Continue anyway" still advances once beat-1 exists', () => {
  assert.equal(shouldAdvance(flags({ userForcedContinue: true })), true)
})

// ── Threshold agreement with the funnel guard ──────────────────────────────

test("beat threshold matches lib/funnel-guard.ts, so the screens cannot disagree", () => {
  assert.equal(
    BEAT_READY_MIN_CHARS,
    FUNNEL_MIN_BEAT_CHARS,
    "a mismatch lets processing advance to a beat the guard sends straight back",
  )
})

// ── Partial data ───────────────────────────────────────────────────────────

test("a short or missing beat is not core-ready", () => {
  const beats = fullBeats()
  beats.beat3 = "too short"
  assert.equal(beatsReady(beats), false)
  assert.equal(coreResultReady({ beats, hasClarityScore: true, summaryText: "x" }), false)
})

test("missing score or summary is not core-ready", () => {
  assert.equal(
    coreResultReady({ beats: fullBeats(), hasClarityScore: false, summaryText: "x" }),
    false,
  )
  assert.equal(
    coreResultReady({ beats: fullBeats(), hasClarityScore: true, summaryText: "   " }),
    false,
  )
})

test("canEnterReveal tracks beat-1 only", () => {
  const beats = fullBeats()
  beats.beat5 = ""
  assert.equal(canEnterReveal(beats), true, "later beats stream while the user reads beat-1")
  beats.beat1 = "short"
  assert.equal(canEnterReveal(beats), false)
})

// ── The progress ticker must stay pure ─────────────────────────────────────

test("no timer is cleared from inside a setActiveStep updater", async () => {
  const { readFile } = await import("node:fs/promises")
  const src = await readFile(
    new URL("../../components/challenge/processing-screen.tsx", import.meta.url),
    "utf8",
  )

  // Isolate each setActiveStep(...) call and look for a side effect inside it.
  // React 19 may invoke an updater for a render it then discards; a
  // clearInterval living in one can kill the ticker while the state update is
  // never committed, freezing the ring mid-sequence (the reported "88%").
  const calls: string[] = []
  const marker = "setActiveStep("
  for (let i = src.indexOf(marker); i !== -1; i = src.indexOf(marker, i + 1)) {
    let depth = 0
    let j = i + marker.length - 1
    for (; j < src.length; j++) {
      if (src[j] === "(") depth++
      else if (src[j] === ")") {
        depth--
        if (depth === 0) break
      }
    }
    calls.push(src.slice(i, j + 1))
  }

  assert.ok(calls.length > 0, "expected to find setActiveStep calls to inspect")
  for (const call of calls) {
    assert.ok(
      !/clearInterval|clearTimeout|setInterval|setTimeout/.test(call),
      `state updater must be pure, found a timer side effect in: ${call.slice(0, 120)}`,
    )
  }
})
