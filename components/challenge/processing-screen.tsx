"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { useChallenge, type ChallengeState, type Audience } from "@/context/challenge-context"
import { streamBeatFromApi, isAbortErrorLike } from "@/lib/stream-beat-client"
import { submitToGoogleSheet } from "@/lib/submit-to-google-sheet"
import { preloadSummaryAudio } from "@/lib/client/summary-audio-cache"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import { ChallengeMenuButton } from "@/components/challenge/challenge-funnel-header-actions"

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

const BEAT_READY_MIN_CHARS = 40
const HARD_TIMEOUT_MS = 60_000

function generateMockBeats(firstName: string) {
  const n = firstName.trim() || "You"
  return {
    beat1: `${n}, looking at everything you shared - one thing becomes immediately clear.

The thing that's stuck isn't stuck because you lack capability. It's stuck because you've been solving the wrong layer.

Most leaders at your level do the same thing. They see a problem, assess their options, and make the best decision they can with what they can see.

But the real constraint isn't in the visible options. It's in the frame you're using to look at them.

What you described in your first answer - the thing that's not moving the way it should - is a symptom. Not the cause.

The cause is a structural pattern. It's been running for longer than this specific situation. And once you see it, you'll recognize it in a dozen other places too.`,

    beat2: `The picture you painted of twelve months from now - that's not a fantasy. It's a signal.

Your subconscious already knows what "working" looks like. The evidence you described - the conversations, the calendar, the visible signs of movement - that's not imagination.

It's pattern recognition in reverse.

What your answer reveals is that the gap between where you are and where you want to be is not a knowledge gap. It's not a resource gap.

It's a clarity gap.

You already know what needs to happen. What's missing is a clean signal - one decision that makes the others obvious.`,

    beat3: `The noise you named - the things pulling at your attention - that's the most important part of what you shared.

Because here's what most leaders miss: noise isn't random. It's structural.

The same things that pull at you today have been pulling at you for longer than you realize. The pattern repeats not because you lack discipline - but because the system is designed to produce that noise.

Every item you mentioned is a symptom of the same root constraint.

When you solve at the root - the noise doesn't get quieter. It disappears.`,

    beat4: `You described a moment when things clicked. When the version of you that breaks through ceilings showed up.

That moment wasn't luck. It was conditions.

What was absent: the noise. The second-guessing. The overhead of decisions that hadn't been made yet.

What was present: clarity. A single focus. Permission to move without explaining yourself.

The difference between now and then isn't capability. It's interference.

The question isn't how to become that version of yourself again. The question is: what's currently in the way?

We now know the answer.`,

    beat5: `The morning you described - the one where the noise was gone - that's not a visualization exercise.

It's a prototype.

Everything in that picture is technically possible tomorrow. Nothing you described requires resources you don't have, people you don't know, or capabilities you haven't built.

What it requires is a single decision. One honest decision that clears the interference and makes the rest of the path obvious.

That decision is now visible.`,
  }
}

async function fetchClarityScoreInBackground(
  responses: ChallengeState["responses"],
  firstName: string,
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
            /* ignore */
          }
        }
      }
    }
    return full || null
  } catch {
    return null
  }
}

async function fetchReportInBackground(args: {
  firstName: string
  email: string
  responses: ChallengeState["responses"]
  beats: ChallengeState["beats"]
  audience: Audience
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
        audience: args.audience,
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
  // Tracks whether the summary's TTS audio bytes have finished loading
  // (either from IndexedDB on a re-run or freshly from /api/tts).
  // Navigation to beat-1 is blocked until this is true so /summary's
  // listen button never has to show a loading state.
  const [audioReady, setAudioReady] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const saveParamsRef = useRef({ serialNumber: state.serialNumber, email: state.email, firstName: state.firstName })
  saveParamsRef.current = { serialNumber: state.serialNumber, email: state.email, firstName: state.firstName }

  const saveOutputToSheet = useCallback(
    (beatNumber: 1 | 2 | 3 | 4 | 5, output: string) => {
      const { serialNumber, email, firstName } = saveParamsRef.current
      if (!serialNumber || !email?.trim() || !output.trim()) return
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
    [audience],
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

    const fullyCached =
      state.beats.beat1.trim().length >= BEAT_READY_MIN_CHARS &&
      state.beats.beat2.trim().length >= BEAT_READY_MIN_CHARS &&
      state.beats.beat3.trim().length >= BEAT_READY_MIN_CHARS &&
      state.beats.beat4.trim().length >= BEAT_READY_MIN_CHARS &&
      state.beats.beat5.trim().length >= BEAT_READY_MIN_CHARS &&
      !!state.clarityScore &&
      !!state.reportData &&
      state.summaryText.trim().length > 0

    if (fullyCached) {
      void preloadSummaryAudio(state.summaryText).then((buf) => {
        if (buf) setAudioReady(true)
      })
      return
    }

    let active = true
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal
    const { firstName, responses } = state

    const bodyBase = { firstName, responses }
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null
    const beatsLenRef = { current: state.beats.beat1.trim().length }
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

      scorePromise = fetchClarityScoreInBackground(state.responses, state.firstName)
      void scorePromise.then((score) => {
        if (score) setClarityScore(score)
      })

      void (async () => {
        const score = scorePromise ? await scorePromise : null
        const report = await fetchReportInBackground({
          firstName: state.firstName,
          email: saveParamsRef.current.email,
          audience,
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
            },
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

      const tasks = [1, 2, 3, 4, 5].map((n) =>
        streamBeatFromApi(
          { beatNumber: n as 1 | 2 | 3 | 4 | 5, audience, ...bodyBase },
          (text) => {
            finalTexts[n] = text
            setBeat(`beat${n}` as "beat1" | "beat2" | "beat3" | "beat4" | "beat5", text)
            if (n === 1) beatsLenRef.current = text.trim().length
          },
        ).then((result) => {
          if (finalTexts[n]) {
            saveOutputToSheet(n as 1 | 2 | 3 | 4 | 5, finalTexts[n])
          }
          return result
        }),
      )

      const results = await Promise.all(tasks)
      if (fallbackTimer) clearTimeout(fallbackTimer)
      if (!active) return

      const m = generateMockBeats(firstName)
      const keys = ["beat1", "beat2", "beat3", "beat4", "beat5"] as const

      if (!results[0]?.ok) {
        const firstErr = "error" in results[0]! ? results[0].error : ""
        if (typeof firstErr === "string" && /Prompt configuration error/i.test(firstErr)) {
          setMissingPrompts(true)
          return
        }
        applyMocksRef.current()
        for (let i = 0; i < 5; i++) finalTexts[i + 1] = m[keys[i]]
      } else {
        for (let i = 0; i < 5; i++) {
          const r = results[i]
          if (r && !r.ok) {
            if ("error" in r && r.error === "aborted") {
              /* leave whatever streamed */
            } else {
              setBeat(keys[i], m[keys[i]])
              saveOutputToSheet((i + 1) as 1 | 2 | 3 | 4 | 5, m[keys[i]])
              finalTexts[i + 1] = m[keys[i]]
            }
          }
        }
      }

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
        if (text) {
          setSummaryText(text)
          void preloadSummaryAudio(text).then((buf) => {
            if (buf) setAudioReady(true)
          })
        }
      })
    })()

    return () => {
      active = false
      abortRef.current?.abort()
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, setBeat, state.firstName, state.responses, audience])

  const allReady =
    state.beats.beat1.trim().length >= BEAT_READY_MIN_CHARS &&
    state.beats.beat2.trim().length >= BEAT_READY_MIN_CHARS &&
    state.beats.beat3.trim().length >= BEAT_READY_MIN_CHARS &&
    state.beats.beat4.trim().length >= BEAT_READY_MIN_CHARS &&
    state.beats.beat5.trim().length >= BEAT_READY_MIN_CHARS &&
    !!state.clarityScore &&
    !!state.reportData &&
    state.summaryText.trim().length > 0 &&
    audioReady

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

  const progressPercent = ((activeStep + 1) / processingSteps.length) * 100

  if (missingPrompts) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="s-card-static animate-fade-in-up w-full max-w-md p-8 text-center">
          <h2 className="mb-3 font-serif text-[24px] leading-snug text-ink">
            {audience === "team" ? "Team content" : "Content"} not yet
            <span className="block font-serif-italic">configured.</span>
          </h2>
          <p className="mb-7 text-[15px] leading-[1.75] text-foreground/85">
            The {audience} prompts haven&apos;t been seeded yet. Please contact the
            admin so this audience can take the diagnostic.
          </p>
          <a href="/" className="s-btn">
            Back to home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5">
      {/* Marine palette already gives us a deep navy bg + teal signal - the
          atmospheric layers below paint with palette tokens, not hardcoded
          colors, so they re-skin if Marine is ever changed. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute left-[15%] top-[20%] h-72 w-72 rounded-full opacity-[0.18] blur-3xl animate-glow-pulse"
          style={{ background: "rgba(var(--glow), 0.6)" }}
        />
        <div
          className="absolute right-[10%] bottom-[15%] h-80 w-80 rounded-full opacity-[0.12] blur-3xl animate-glow-pulse"
          style={{ background: "rgba(var(--glow), 0.5)", animationDelay: "2s" }}
        />
        <div
          className="absolute top-[30%] right-[20%] h-1.5 w-1.5 rounded-full opacity-40 animate-float"
          style={{ background: "var(--signal)", animationDelay: "0.4s" }}
        />
        <div
          className="absolute bottom-[35%] left-[25%] h-1 w-1 rounded-full opacity-50 animate-float"
          style={{ background: "var(--signal)", animationDelay: "0.9s" }}
        />
      </div>

      <div className="absolute left-5 top-5 z-20 sm:left-8">
        <ChallengeMenuButton variant="dark" />
      </div>
      <div className="absolute right-5 top-5 z-20 sm:right-8">
        <ChallengeNavHome variant="dark" />
      </div>

      <div className="page-enter relative z-10 flex w-full max-w-md flex-col items-center">
        {/* Progress ring - uses signal for the active stroke */}
        <div className="relative mb-10 h-28 w-28">
          <div
            className="absolute -inset-4 rounded-full opacity-[0.18] animate-glow-pulse"
            style={{ background: "rgba(var(--glow), 0.5)" }}
          />
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 112 112">
            <circle
              cx="56"
              cy="56"
              r="50"
              fill="none"
              stroke="var(--border)"
              strokeWidth="2"
              opacity="0.4"
            />
            <circle
              cx="56"
              cy="56"
              r="50"
              fill="none"
              stroke="var(--signal)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - progressPercent / 100)}`}
              className="transition-all duration-700 ease-out"
              style={{ filter: "drop-shadow(0 0 6px rgba(var(--glow), 0.45))" }}
            />
          </svg>
          <div
            className="animate-spin-slow absolute inset-3 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "color-mix(in srgb, var(--signal) 60%, transparent)",
              borderRightColor: "color-mix(in srgb, var(--signal) 20%, transparent)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-[28px] tabular-nums text-ink">
              {Math.round(progressPercent)}%
            </span>
          </div>
        </div>

        <p className="eyebrow mb-3 text-foreground/70">The mirror is being built</p>
        <h1 className="mb-3 text-center font-serif text-[28px] leading-tight text-ink sm:text-[32px]">
          What you shared is being read
          <span className="block font-serif-italic text-foreground">carefully.</span>
        </h1>
        <p className="mb-10 max-w-sm text-center font-serif-italic text-[16px] leading-[1.7] text-foreground/75">
          What surfaces has always been yours.
        </p>

        <ul className="mb-8 w-full space-y-3" aria-label="Processing steps">
          {processingSteps.map((label, i) => {
            const done = i < activeStep
            const active = i === activeStep
            const visible = i <= activeStep
            return (
              <li
                key={label}
                className={`flex items-center gap-4 text-[15px] transition-all duration-500 ${
                  visible ? "animate-stagger-in" : "opacity-0"
                } ${
                  done
                    ? "text-foreground/55"
                    : active
                      ? "font-medium text-ink"
                      : "text-foreground/30"
                }`}
                style={{ animationDelay: visible ? `${i * 150}ms` : undefined }}
              >
                {done ? (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Check className="h-3 w-3 text-ink" strokeWidth={2} aria-hidden />
                  </span>
                ) : active ? (
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "color-mix(in srgb, var(--signal) 20%, transparent)",
                    }}
                  >
                    <span className="pulse-dot" aria-hidden />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border">
                    <span className="h-1 w-1 rounded-full bg-foreground/30" aria-hidden />
                  </span>
                )}
                <span>{label}</span>
              </li>
            )
          })}
        </ul>

        {showClosingLine && (
          <div className="animate-curtain-rise text-center">
            <p className="font-serif-italic text-[19px] leading-snug text-ink sm:text-[20px]">
              What you are about to see could only have been built from your
              words.
            </p>
            <div
              className="mx-auto mt-4 h-px w-full max-w-xs"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--signal), transparent)",
              }}
            />
          </div>
        )}

        {process.env.NODE_ENV === "development" && usedMock && (
          <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-foreground/40">
            Dev · using mirror copy (add OPENROUTER_API_KEY for AI)
          </p>
        )}
      </div>
    </div>
  )
}
