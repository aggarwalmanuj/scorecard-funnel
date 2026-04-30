"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { useChallenge, type ChallengeState, type Audience } from "@/context/challenge-context"
import { streamBeatFromApi, isAbortErrorLike } from "@/lib/stream-beat-client"
import { submitToGoogleSheet } from "@/lib/submit-to-google-sheet"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import {
  ChallengeMenuButton,
} from "@/components/challenge/challenge-funnel-header-actions"

const processingSteps = [
  "Reading what you shared",
  "Finding where the noise is coming from",
  "Scoring your clarity reading",
  "Building your mirror",
  "Drafting your detailed report",
  "Writing your closing reflection",
  "Finding the one thing that moves everything else",
  "Setting your reading aside for you",
]

// Each beat / score / report needs to land before we redirect.  Beat
// content streams in chunks, so we use a small length floor as the proxy
// for "this beat is ready to read".
const BEAT_READY_MIN_CHARS = 40

// Hard ceiling — if the upstream LLM hangs and nothing arrives, we still
// move the user forward so they aren't stuck on the loading screen
// indefinitely.  The downstream pages have their own fallbacks.
const HARD_TIMEOUT_MS = 60_000

function generateMockBeats(firstName: string) {
  const n = firstName.trim() || "You"
  return {
    beat1: `${n}, looking at everything you shared — one thing becomes immediately clear.

The thing that's stuck isn't stuck because you lack capability. It's stuck because you've been solving the wrong layer.

Most leaders at your level do the same thing. They see a problem, assess their options, and make the best decision they can with what they can see.

But the real constraint isn't in the visible options. It's in the frame you're using to look at them.

What you described in your first answer — the thing that's not moving the way it should — is a symptom. Not the cause.

The cause is a structural pattern. It's been running for longer than this specific situation. And once you see it, you'll recognize it in a dozen other places too.`,

    beat2: `The picture you painted of twelve months from now — that's not a fantasy. It's a signal.

Your subconscious already knows what "working" looks like. The evidence you described — the conversations, the calendar, the visible signs of movement — that's not imagination.

It's pattern recognition in reverse.

What your answer reveals is that the gap between where you are and where you want to be is not a knowledge gap. It's not a resource gap.

It's a clarity gap.

You already know what needs to happen. What's missing is a clean signal — one decision that makes the others obvious.`,

    beat3: `The noise you named — the things pulling at your attention — that's the most important part of what you shared.

Because here's what most leaders miss: noise isn't random. It's structural.

The same things that pull at you today have been pulling at you for longer than you realize. The pattern repeats not because you lack discipline — but because the system is designed to produce that noise.

Every item you mentioned is a symptom of the same root constraint.

When you solve at the root — the noise doesn't get quieter. It disappears.`,

    beat4: `You described a moment when things clicked. When the version of you that breaks through ceilings showed up.

That moment wasn't luck. It was conditions.

What was absent: the noise. The second-guessing. The overhead of decisions that hadn't been made yet.

What was present: clarity. A single focus. Permission to move without explaining yourself.

The difference between now and then isn't capability. It's interference.

The question isn't how to become that version of yourself again. The question is: what's currently in the way?

We now know the answer.`,

    beat5: `The morning you described — the one where the noise was gone — that's not a visualization exercise.

It's a prototype.

Everything in that picture is technically possible tomorrow. Nothing you described requires resources you don't have, people you don't know, or capabilities you haven't built.

What it requires is a single decision. One honest decision that clears the interference and makes the rest of the path obvious.

That decision is now visible.`,
  }
}

// Background pre-generation of the LLM clarity score. Cached on the
// ChallengeContext so the summary screen and the downloadable report
// render instantly.
async function fetchClarityScoreInBackground(
  responses: ChallengeState["responses"],
  firstName: string
): Promise<{
  subscores: { directionClarity: number; identityAlignment: number; decisionReadiness: number; energyAlignment: number }
  reasons: { directionClarity?: string; identityAlignment?: string; decisionReadiness?: string; energyAlignment?: string }
  nsState?: string
} | null> {
  try {
    const res = await fetch("/api/challenge/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, responses }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      subscores?: { directionClarity?: number; identityAlignment?: number; decisionReadiness?: number; energyAlignment?: number }
      reasons?: { directionClarity?: string; identityAlignment?: string; decisionReadiness?: string; energyAlignment?: string }
      nsState?: string
    }
    const s = json.subscores
    if (
      !s ||
      typeof s.directionClarity !== "number" ||
      typeof s.identityAlignment !== "number" ||
      typeof s.decisionReadiness !== "number" ||
      typeof s.energyAlignment !== "number"
    ) {
      return null
    }
    return {
      subscores: {
        directionClarity: s.directionClarity,
        identityAlignment: s.identityAlignment,
        decisionReadiness: s.decisionReadiness,
        energyAlignment: s.energyAlignment,
      },
      reasons: json.reasons ?? {},
      nsState: json.nsState,
    }
  } catch {
    return null
  }
}

// Background pre-generation of the closing AI summary text. Reads the
// streaming SSE response from /api/challenge/summary, accumulates the
// full text, and returns it. Cached on ChallengeContext so the summary
// screen renders instantly without a live stream (and without the
// ECONNRESET noise that comes from aborting an in-flight stream).
async function streamSummaryInBackground(args: {
  firstName: string
  beats: ChallengeState["beats"]
}): Promise<string | null> {
  try {
    const res = await fetch("/api/challenge/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    })
    if (!res.ok || !res.body) return null
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let carry = ""
    let full = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      carry += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = carry.indexOf("\n\n")) !== -1) {
        const block = carry.slice(0, idx)
        carry = carry.slice(idx + 2)
        for (const line of block.split("\n")) {
          if (!line.startsWith("data:")) continue
          const raw = line.slice(5).trim()
          try {
            const j = JSON.parse(raw) as { c?: string; done?: boolean }
            if (j.done) continue
            if (typeof j.c === "string") full += j.c
          } catch {
            /* ignore malformed SSE payload */
          }
        }
      }
    }
    return full || null
  } catch {
    return null
  }
}

// Background pre-generation of the full deep report. Uses the cached score
// (if available) to skip the report endpoint's internal scoring call,
// guaranteeing the same numbers the user saw on the summary page.
async function fetchReportInBackground(args: {
  firstName: string
  email: string
  responses: ChallengeState["responses"]
  beats: ChallengeState["beats"]
  precomputedScore?: {
    subscores: { directionClarity: number; identityAlignment: number; decisionReadiness: number; energyAlignment: number }
    reasons?: { directionClarity?: string; identityAlignment?: string; decisionReadiness?: string; energyAlignment?: string }
    nsState?: string
  } | null
}): Promise<unknown | null> {
  try {
    const res = await fetch("/api/challenge/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: args.firstName,
        email: args.email,
        responses: args.responses,
        beats: args.beats,
        precomputedScore: args.precomputedScore ?? undefined,
      }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function ProcessingScreen({ audience }: { audience: Audience }) {
  const router = useRouter()
  const { state, setBeat, isHydrated, setClarityScore, setReportData, setSummaryText } = useChallenge()
  const [activeStep, setActiveStep] = useState(0)
  const [minElapsed, setMinElapsed] = useState(false)
  const [showClosingLine, setShowClosingLine] = useState(false)
  const [usedMock, setUsedMock] = useState(false)
  const [missingPrompts, setMissingPrompts] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Stable ref for save params — avoids re-triggering the streaming effect
  const saveParamsRef = useRef({ serialNumber: state.serialNumber, email: state.email, firstName: state.firstName })
  saveParamsRef.current = { serialNumber: state.serialNumber, email: state.email, firstName: state.firstName }

  const saveOutputToSheet = useCallback(
    (beatNumber: 1 | 2 | 3 | 4 | 5, output: string) => {
      const { serialNumber, email, firstName } = saveParamsRef.current
      if (!serialNumber || !email?.trim() || !output.trim()) return
      // Fire-and-forget: the browser completes fetches even after component unmount.
      // submitToGoogleSheet has built-in retry logic.
      void submitToGoogleSheet({
        action: "beat_output",
        firstName,
        email: email.trim(),
        audience,
        serialNumber,
        beatNumber,
        output,
      })
    },
    [audience]
  )

  const applyMocksRef = useRef(() => {})
  applyMocksRef.current = () => {
    const m = generateMockBeats(saveParamsRef.current.firstName)
    setBeat("beat1", m.beat1)
    setBeat("beat2", m.beat2)
    setBeat("beat3", m.beat3)
    setBeat("beat4", m.beat4)
    setBeat("beat5", m.beat5)
    setUsedMock(true)
    saveOutputToSheet(1, m.beat1)
    saveOutputToSheet(2, m.beat2)
    saveOutputToSheet(3, m.beat3)
    saveOutputToSheet(4, m.beat4)
    saveOutputToSheet(5, m.beat5)
  }

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 7000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setActiveStep((s) => {
        if (s >= processingSteps.length - 1) {
          clearInterval(id)
          return s
        }
        return s + 1
      })
    }, 2000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (activeStep < processingSteps.length - 1) return
    const t = setTimeout(() => setShowClosingLine(true), 600)
    return () => clearTimeout(t)
  }, [activeStep])

  useEffect(() => {
    if (!isHydrated) return

    let active = true
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal
    const { firstName, responses } = state

    const bodyBase = {
      firstName,
      responses,
    }

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    const beatsLenRef = { current: state.beats.beat1.trim().length }

    // Background pre-generation handles. Promise resolution intentionally
    // happens AFTER this component unmounts (the user navigates onward to
    // beat-1 once beat1 has streamed enough). The ChallengeProvider stays
    // mounted, so setClarityScore / setReportData still land in localStorage.
    let scorePromise: Promise<ReturnType<typeof fetchClarityScoreInBackground> extends Promise<infer T> ? T : never> | null = null

    void (async () => {
      try {
        const readyRes = await fetch("/api/challenge/ai-ready", { signal })
        if (!active) return
        const readyJson = (await readyRes.json()) as { ok?: boolean }
        if (!readyJson.ok) {
          applyMocksRef.current()
          return
        }
      } catch (e) {
        if (!active) return
        if (isAbortErrorLike(e)) return
        applyMocksRef.current()
        return
      }

      if (!active) return

      // Kick off LLM clarity-score generation in parallel with the beat
      // streams. Don't block beat rendering — just stash the result to
      // ChallengeContext when it arrives.
      scorePromise = fetchClarityScoreInBackground(state.responses, state.firstName)
      void scorePromise.then((score) => {
        if (score) setClarityScore(score)
      })

      // Kick off the deep-report generation IMMEDIATELY (in parallel with
      // both the score call and the beat streams). The report endpoint's
      // prompt explicitly handles empty beats by deriving every quote and
      // reflection from the user's raw answers — so we don't need to wait
      // for beats to finish streaming. This is what makes the offer-page
      // Download feel instant: by the time the user has clicked through 5
      // beat reveals + the summary, the report has long since completed.
      void (async () => {
        const score = scorePromise ? await scorePromise : null
        const report = await fetchReportInBackground({
          firstName: state.firstName,
          email: saveParamsRef.current.email,
          responses: state.responses,
          beats: { beat1: "", beat2: "", beat3: "", beat4: "", beat5: "" },
          precomputedScore: score,
        })
        if (report) {
          setReportData(
            report as {
              clarity: unknown
              reasons: unknown
              nsState?: string
              report: unknown
              scoreSource: "llm" | "fallback"
            }
          )
        }
      })()

      fallbackTimer = setTimeout(() => {
        if (!active) return
        if (beatsLenRef.current < 40) {
          applyMocksRef.current()
        }
      }, 28000)

      const finalTexts: Record<number, string> = {}

      // Do NOT pass the abort signal to beat streams.
      // When the user navigates away (component unmounts), the streams must
      // continue in the background so that (a) all content is captured and
      // (b) the completed output is saved to the database.  The `active`
      // flag already prevents stale UI updates; only the initial ai-ready
      // check uses the abort signal.
      const tasks = [1, 2, 3, 4, 5].map((n) =>
        streamBeatFromApi(
          { beatNumber: n as 1 | 2 | 3 | 4 | 5, audience, ...bodyBase },
          (text) => {
            finalTexts[n] = text
            // Always update context — the ChallengeProvider stays mounted
            // across page transitions, so beat reveal pages receive the
            // full streamed content even after this component unmounts.
            setBeat(`beat${n}` as "beat1" | "beat2" | "beat3" | "beat4" | "beat5", text)
            if (n === 1) beatsLenRef.current = text.trim().length
          },
        ).then((result) => {
          // Save to DB as long as we have content, even if the component
          // has unmounted.  Previously, aborted streams returned ok:false
          // and the save was skipped — this was the main cause of missing
          // beat outputs in the database.
          if (finalTexts[n]) {
            saveOutputToSheet(n as 1 | 2 | 3 | 4 | 5, finalTexts[n])
          }
          return result
        })
      )

      const results = await Promise.all(tasks)
      if (fallbackTimer) clearTimeout(fallbackTimer)
      if (!active) return

      const m = generateMockBeats(firstName)
      const keys = ["beat1", "beat2", "beat3", "beat4", "beat5"] as const

      if (!results[0]?.ok) {
        // If the failure is "Prompt configuration error", surface a clear empty
        // state instead of falling back to individual mock copy. This is
        // critical for the team funnel — a missing team prompt must NOT be
        // masked by individual content.
        const firstErr = "error" in results[0]! ? results[0].error : ""
        if (typeof firstErr === "string" && /Prompt configuration error/i.test(firstErr)) {
          setMissingPrompts(true)
          return
        }
        // Whole-stream failure → fall back to mocks for everything.
        applyMocksRef.current()
        // Use the mocks for the report payload so the offer-page Download
        // still has content tailored to the current responses.
        for (let i = 0; i < 5; i++) finalTexts[i + 1] = m[keys[i]]
      } else {
        for (let i = 0; i < 5; i++) {
          const r = results[i]
          if (r && !r.ok) {
            if ("error" in r && r.error === "aborted") {
              /* aborted streams: leave whatever streamed so far */
            } else {
              setBeat(keys[i], m[keys[i]])
              saveOutputToSheet((i + 1) as 1 | 2 | 3 | 4 | 5, m[keys[i]])
              finalTexts[i + 1] = m[keys[i]]
            }
          }
        }
      }

      // Note: report generation already fired above, parallel with beats.
      // We deliberately do NOT re-fire it here with the streamed beats —
      // the t=0 fire ensures the offer-page Download is instant for fast
      // clickers, and the model's content remains tailored because every
      // quote is sourced directly from the user's own writing.

      // Now that beats are settled, kick off the closing AI summary
      // generation in the background. Beats are required input for the
      // summary prompt (it weaves the thread across them), so this one
      // genuinely has to wait until they're here. The journey-summary
      // screen reads from the cached text instead of streaming live.
      const finalBeats: ChallengeState["beats"] = {
        beat1: finalTexts[1] || state.beats.beat1 || "",
        beat2: finalTexts[2] || state.beats.beat2 || "",
        beat3: finalTexts[3] || state.beats.beat3 || "",
        beat4: finalTexts[4] || state.beats.beat4 || "",
        beat5: finalTexts[5] || state.beats.beat5 || "",
      }
      void streamSummaryInBackground({
        firstName: state.firstName,
        beats: finalBeats,
      }).then((text) => {
        if (text) setSummaryText(text)
      })
    })()

    return () => {
      active = false
      // Only abort the ai-ready check, NOT the beat streams.
      // Beat streams are left running so they complete and save to DB.
      abortRef.current?.abort()
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, setBeat, state.firstName, state.responses, audience])

  // Everything-ready guard — we only navigate forward once the user has
  // (a) all 5 beat outputs streamed, (b) the clarity score cached,
  // (c) the deep report cached, and (d) the closing AI summary cached.
  // This makes every downstream page render instantly, at the cost of a
  // longer wait on this screen.
  const allReady =
    state.beats.beat1.trim().length >= BEAT_READY_MIN_CHARS &&
    state.beats.beat2.trim().length >= BEAT_READY_MIN_CHARS &&
    state.beats.beat3.trim().length >= BEAT_READY_MIN_CHARS &&
    state.beats.beat4.trim().length >= BEAT_READY_MIN_CHARS &&
    state.beats.beat5.trim().length >= BEAT_READY_MIN_CHARS &&
    !!state.clarityScore &&
    !!state.reportData &&
    state.summaryText.trim().length > 0

  // Hard timeout — never strand the user if upstream hangs.
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), HARD_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!minElapsed) return
    if (missingPrompts) return
    if (!allReady && !timedOut) return
    const t = setTimeout(() => router.push(`/challenge/${audience}/beat-1`), 400)
    return () => clearTimeout(t)
  }, [minElapsed, allReady, timedOut, router, audience, missingPrompts])

  /* Progress percentage for the ring */
  const progressPercent = ((activeStep + 1) / processingSteps.length) * 100

  if (missingPrompts) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="max-w-md w-full text-center bg-card rounded-2xl p-8 neu-card-primary animate-fade-in-up">
          <h2 className="font-black tracking-tight text-[22px] text-foreground mb-2">
            {audience === "team" ? "Team content" : "Content"} not yet configured
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
            The {audience} prompts haven&apos;t been seeded in the database yet, so we
            can&apos;t generate your reflection. Please contact the admin to seed the
            content for this audience.
          </p>
          <a
            href="/"
            className="inline-block rounded-xl font-bold px-5 py-3 neu-border-primary neu-shadow-primary-xs neu-btn-press bg-primary text-primary-foreground"
          >
            Back to home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden bg-[#0a0718]">
      <div className="pointer-events-none absolute inset-0 opacity-40 processing-gradient-bg" />

      {/* Atmospheric particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-[15%] left-[10%] w-1 h-1 rounded-full bg-[#8b7cf6]/30 animate-float delay-200" />
        <div className="absolute top-[30%] right-[15%] w-1.5 h-1.5 rounded-full bg-[#8b7cf6]/20 animate-float delay-400" />
        <div className="absolute bottom-[25%] left-[20%] w-1 h-1 rounded-full bg-[#8b7cf6]/25 animate-float delay-600" />
        <div className="absolute top-[60%] right-[25%] w-1 h-1 rounded-full bg-white/10 animate-float delay-300" />
        <div className="absolute bottom-[40%] left-[40%] w-1.5 h-1.5 rounded-full bg-[#8b7cf6]/15 animate-float delay-700" />
        {/* Large blurred orbs */}
        <div className="absolute top-[20%] left-[5%] w-32 h-32 rounded-full bg-[#8b7cf6]/8 blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-[15%] right-[10%] w-40 h-40 rounded-full bg-[#8b7cf6]/6 blur-3xl animate-glow-pulse delay-500" />
      </div>

      <div className="absolute top-4 left-5 sm:left-8 z-20">
        <ChallengeMenuButton variant="dark" />
      </div>
      <div className="absolute top-4 right-5 sm:right-8 z-20 flex items-center gap-2 flex-wrap justify-end">
        <ChallengeNavHome variant="dark" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md page-enter">
        <div className="mb-10">
        </div>

        {/* Enhanced Progress Ring - Larger with neon glow */}
        <div className="relative w-28 h-28 mb-8">
          {/* Outer glow orb */}
          <div className="absolute -inset-4 rounded-full bg-[#8b7cf6]/8 animate-glow-pulse" />
          {/* Background ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <circle
              cx="56" cy="56" r="50" fill="none"
              stroke="#8b7cf6"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - progressPercent / 100)}`}
              className="transition-all duration-700 ease-out"
              style={{ filter: "drop-shadow(0 0 6px rgba(139,124,246,0.4))" }}
            />
          </svg>
          {/* Spinning accent */}
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#8b7cf6]/60 border-r-[#8b7cf6]/20 animate-spin-slow"
          />
          {/* Inner glow */}
          <div className="absolute inset-5 rounded-full bg-[#8b7cf6]/15 animate-pulse" />
          {/* Percentage counter */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-black text-2xl text-white/80 tabular-nums">{Math.round(progressPercent)}%</span>
          </div>
        </div>

        <h1 className="font-black text-[28px] text-white text-center leading-tight mb-3">
          The mirror is being built.
        </h1>
        <p className="font-sans text-base text-white/60 text-center mb-10 max-w-sm">
          What you shared is being read carefully.
          <br />
          What surfaces has always been yours.
        </p>

        <ul className="w-full space-y-3 mb-8" aria-label="Processing steps">
          {processingSteps.map((label, i) => {
            const done = i < activeStep
            const active = i === activeStep
            const visible = i <= activeStep
            return (
              <li
                key={label}
                className={`flex items-center gap-3 text-[15px] transition-all duration-500 ${
                  visible ? "animate-stagger-in" : "opacity-0"
                } ${
                  done
                    ? "text-white/50"
                    : active
                      ? "text-white font-semibold"
                      : "text-white/20"
                }`}
                style={{ animationDelay: visible ? `${i * 150}ms` : undefined }}
              >
                {done ? (
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#8b7cf6]/20 shrink-0">
                    <Check className="w-4 h-4 text-[#8b7cf6]" aria-hidden />
                  </span>
                ) : active ? (
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-[#8b7cf6]/30 neu-shadow-primary-xs flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-[#8b7cf6] animate-pulse" />
                  </span>
                ) : (
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-white/5 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
                  </span>
                )}
                <span>{label}</span>
              </li>
            )
          })}
        </ul>

        {showClosingLine && (
          <div className="animate-curtain-rise text-center">
            <p className="font-black text-lg sm:text-xl text-[#8b7cf6]">
              What you are about to see could only have been built from your words.
            </p>
            <div className="mt-3 h-0.5 w-full bg-gradient-to-r from-transparent via-[#8b7cf6]/50 to-transparent rounded-full" />
          </div>
        )}

        {process.env.NODE_ENV === "development" && usedMock && (
          <p className="mt-6 text-xs text-white/30 text-center">
            Dev: using built-in mirror copy (add OPENROUTER_API_KEY for AI).
          </p>
        )}
      </div>
    </div>
  )
}
