"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { useChallenge, type ChallengeState, type Audience } from "@/context/challenge-context"
import { streamBeatFromApi, isAbortErrorLike } from "@/lib/stream-beat-client"
import { submitToGoogleSheet } from "@/lib/submit-to-google-sheet"
import { preloadSummaryAudio } from "@/lib/client/summary-audio-cache"
import { preloadBeatAudio } from "@/lib/client/beat-audio-cache"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import { ChallengeMenuButton } from "@/components/challenge/challenge-funnel-header-actions"
import { displayFor, type VerticalDisplay } from "@/lib/vertical-display"
import {
  DIMENSION_COLORS,
  DIMENSION_ICONS,
  DIMENSION_ORDER,
  ScoreRing,
} from "@/components/challenge/score-visuals"
import { MacWindow } from "@/components/visuals/mac-window"

// Step labels carry the vertical's product vocabulary (One-Name Law): an
// ADHD visitor watches their "ADHD Belief Score" being built, a healthcare
// leader their "Belief Profile" - not a generic score.
const processingStepsFor = (productName: string): string[] => [
  "Reading what you shared",
  "Finding where the noise is coming from",
  `Calculating your ${productName}`,
  "Building your mirror",
  "Drafting your detailed action plan",
  "Writing your closing reflection",
  "Finding the one thing that moves everything else",
  `Setting your ${productName} aside for you`,
]

const BEAT_READY_MIN_CHARS = 40
// Auto-navigate fallback if the pipeline hasn't completed by here.
// 75s gives slow networks room to finish without abandoning the user
// (testers reported sitting for ~2 min with no feedback - that wait now
// has explicit progressive messaging plus a "Continue anyway" button).
const HARD_TIMEOUT_MS = 75_000
// Show "this is taking a moment" after the checklist animation completes
// but allReady hasn't flipped yet.
const SLOW_HINT_AFTER_MS = 22_000
// Surface an explicit escape hatch so the user is never truly stuck.
const ESCAPE_HATCH_AFTER_MS = 45_000

async function fetchClarityScoreInBackground(
  responses: ChallengeState["responses"],
  firstName: string,
  audience: Audience,
): Promise<{
  subscores: { directionClarity: number; identityAlignment: number; decisionReadiness: number; energyAlignment: number }
  reasons: { directionClarity?: string; identityAlignment?: string; decisionReadiness?: string; energyAlignment?: string }
  nsState?: string
} | null> {
  try {
    const res = await fetch("/api/challenge/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, responses, audience }),
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
  audience: Audience
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
  const body = JSON.stringify({
    firstName: args.firstName,
    email: args.email,
    audience: args.audience,
    responses: args.responses,
    beats: args.beats,
    precomputedScore: args.precomputedScore ?? undefined,
  })

  // The report is what the whole assessment exists to deliver, and a single
  // failed call used to end the journey silently: the caller ignores null, so
  // the respondent walked on to the offer page having been shown nothing.
  // Observed in production on the healthcare vertical. Three spaced attempts
  // cover a cold function, a model blip, or a transient upstream 5xx; the
  // funnel has minutes of beat choreography to spend, so the wait is free.
  const BACKOFF_MS = [1500, 4000]
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("/api/challenge/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      if (res.ok) return await res.json()
      console.warn(`[report] attempt ${attempt + 1} failed with ${res.status}`)
    } catch {
      console.warn(`[report] attempt ${attempt + 1} threw`)
    }
    if (attempt < BACKOFF_MS.length) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]))
    }
  }
  console.error("[report] all attempts failed - respondent will see no report")
  return null
}

/**
 * The report's page one, mid-assembly: dimension meters fill with the
 * pipeline's progress, narrative lines materialize one by one, and the
 * score slot stays deliberately empty ("···") - the number doesn't exist
 * yet, and showing choreography as fact would be a lie. Pure FOMO physics:
 * watching your own artifact being written is the one thing you can't
 * walk away from.
 */
function AssemblingReport({
  progress,
  display,
}: {
  progress: number
  display: VerticalDisplay
}) {
  // Target widths are layout choreography (no numbers are shown).
  const targets = [78, 62, 70, 55]
  const frac = (i: number) => Math.max(0, Math.min(1, (progress / 100) * 4 - i))
  return (
    <div className="bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3.5">
        <span className="flex items-center gap-2.5">
          <span className="brand-mark brand-mark-sm" aria-hidden />
          <span className="text-[9px] uppercase tracking-[0.2em] text-foreground/60">
            {display.reportName}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-foreground/50">
          <span className="pulse-dot" aria-hidden />
          Writing
        </span>
      </div>

      <div className="flex items-center gap-4">
        <ScoreRing
          value={progress}
          size={72}
          stroke={6}
          color="var(--signal)"
          animate={false}
          trackOpacity={0.3}
        >
          <span className="font-serif text-[18px] text-ink/45" aria-label="Score pending">
            ···
          </span>
        </ScoreRing>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/50">
            {display.productName}
          </p>
          <div className="mt-2 space-y-1.5" aria-hidden>
            <div className="h-2 w-11/12 animate-pulse rounded-full bg-ink/20" />
            <div className="h-2 w-7/12 animate-pulse rounded-full bg-ink/10" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {DIMENSION_ORDER.map((k, i) => {
          const Icon = DIMENSION_ICONS[k]
          const color = DIMENSION_COLORS[k]
          return (
            <div key={k} className="flex items-center gap-2.5">
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
              >
                <Icon className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
              </span>
              <span className="w-24 truncate text-[9.5px] uppercase tracking-[0.12em] text-foreground/60 sm:w-28">
                {display.pillarLabels[k].label}
              </span>
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${targets[i] * frac(i)}%`, background: color }}
                />
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-4 space-y-1.5 border-t border-border pt-3.5" aria-hidden>
        {[92, 83, 88, 41].map((w, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full bg-foreground/10 transition-opacity duration-700"
            style={{
              width: `${w}%`,
              opacity: progress > 25 + i * 16 ? 1 : 0.15,
            }}
          />
        ))}
      </div>

      <p className="mt-3.5 text-[9px] uppercase tracking-[0.16em] text-foreground/40">
        Page 1 of 6 · built from your own words
      </p>
    </div>
  )
}

export function ProcessingScreen({ audience }: { audience: Audience }) {
  const router = useRouter()
  const { state, setBeat, isHydrated, setClarityScore, setReportData, setSummaryText } = useChallenge()
  const display = displayFor(audience)
  const processingSteps = processingStepsFor(display.productName)
  const [activeStep, setActiveStep] = useState(0)
  const [minElapsed, setMinElapsed] = useState(false)
  const [showClosingLine, setShowClosingLine] = useState(false)
  const [missingPrompts, setMissingPrompts] = useState(false)
  // Tracks whether the summary's TTS audio bytes have finished loading
  // (either from IndexedDB on a re-run or freshly from /api/tts).
  // Navigation to beat-1 is blocked until this is true so /summary's
  // listen button never has to show a loading state.
  const [audioReady, setAudioReady] = useState(false)
  // Tracks whether ALL beat-output writes to Cosmos have finished
  // (success or final failure). Gates navigation to beat-1 so the user
  // can't reach the reveal screens - and the admin Responses tab - before
  // their beat_output rows have been persisted. Without this gate, fast
  // streamers can navigate while the saves are still in flight, which
  // testers reported as missing beat_output cells in the database.
  const [outputsSaved, setOutputsSaved] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  // Collects every save promise so we can await ALL of them before
  // flipping outputsSaved.
  const savePromisesRef = useRef<Promise<boolean>[]>([])

  const saveParamsRef = useRef({ serialNumber: state.serialNumber, email: state.email, firstName: state.firstName })
  saveParamsRef.current = { serialNumber: state.serialNumber, email: state.email, firstName: state.firstName }

  const saveOutputToSheet = useCallback(
    (beatNumber: 1 | 2 | 3 | 4 | 5, output: string): Promise<boolean> => {
      const { serialNumber, email, firstName } = saveParamsRef.current
      if (!serialNumber || !email?.trim() || !output.trim()) {
        return Promise.resolve(false)
      }
      const p = submitToGoogleSheet({
        action: "beat_output",
        firstName,
        email: email.trim(),
        audience,
        serialNumber,
        beatNumber,
        output,
      }).catch(() => false)
      savePromisesRef.current.push(p)
      return p
    },
    [audience],
  )

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 7000)
    return () => clearTimeout(t)
  }, [])

  // ── "Your words, being read" echo ──
  // Short fragments of the user's own answers cycle under the headline
  // while the pipeline runs. This is the funnel's core trust mechanism
  // (nothing here could be generated without their words) made visible at
  // the exact moment they're waiting on the machine. Fragments only - never
  // a full answer - so a shoulder-surfer reads nothing sensitive.
  const wordEchoes = (() => {
    const out: string[] = []
    for (const key of ["question1", "question2", "question3", "question4", "question5"] as const) {
      const t = (state.responses[key] ?? "").trim().replace(/\s+/g, " ")
      if (t.length < 20) continue
      const words = t.split(" ")
      out.push(words.slice(0, 9).join(" ") + (words.length > 9 ? "…" : ""))
    }
    return out
  })()
  const [echoIdx, setEchoIdx] = useState(0)
  useEffect(() => {
    if (wordEchoes.length < 2) return
    const id = setInterval(() => {
      setEchoIdx((i) => (i + 1) % wordEchoes.length)
    }, 3800)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordEchoes.length])

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
      // Re-entry path (e.g. a back-then-forward navigation): everything
      // is already persisted in the challenge context, so no new save
      // round-trips are needed. Mark outputs as already-saved so the
      // navigation gate doesn't wait on an empty promise set.
      setOutputsSaved(true)
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
          setMissingPrompts(true)
          return
        }
      } catch (e) {
        if (!active) return
        if (isAbortErrorLike(e)) return
        setMissingPrompts(true)
        return
      }

      if (!active) return

      scorePromise = fetchClarityScoreInBackground(state.responses, state.firstName, state.audience ?? "main")
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
          setMissingPrompts(true)
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
            // Fire-and-forget TTS preload as soon as this beat's text is
            // finalised. The cache module dedupes by (beatNumber, text), so
            // by the time the user navigates to /beat-N the audio buffer is
            // either already in memory or in-flight - no "Loading…" stall.
            void preloadBeatAudio(n as 1 | 2 | 3 | 4 | 5, finalTexts[n])
          }
          return result
        }),
      )

      const results = await Promise.all(tasks)
      if (fallbackTimer) clearTimeout(fallbackTimer)
      if (!active) return

      // First beat failing is treated as a generation failure - surface the
      // configuration-error UI so the user contacts the admin instead of
      // seeing nothing or fake copy. Individual later-beat failures leave
      // whatever streamed (possibly empty) - downstream code handles empty
      // beats gracefully (`beat: ""`).
      if (!results[0]?.ok) {
        setMissingPrompts(true)
        return
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
        audience: state.audience ?? "main",
        beats: finalBeats,
      }).then((text) => {
        if (text) {
          setSummaryText(text)
          void preloadSummaryAudio(text).then((buf) => {
            if (buf) setAudioReady(true)
          })
        }
      })

      // Wait for all beat-output writes to settle (success OR final
      // failure after retries) before allowing navigation. Promise.race
      // against a hard cap so the user is never stranded if Cosmos is
      // completely unreachable - the writes will still continue under
      // keepalive after navigation, and the in-page retries will have
      // exhausted by then.
      const SAVE_HARD_WAIT_MS = 12_000
      await Promise.race([
        Promise.allSettled(savePromisesRef.current),
        new Promise((r) => setTimeout(r, SAVE_HARD_WAIT_MS)),
      ])
      if (active) setOutputsSaved(true)
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
    audioReady &&
    outputsSaved

  const [timedOut, setTimedOut] = useState(false)
  const [showSlowHint, setShowSlowHint] = useState(false)
  const [showEscapeHatch, setShowEscapeHatch] = useState(false)
  const [userForcedContinue, setUserForcedContinue] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), HARD_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const t1 = setTimeout(() => setShowSlowHint(true), SLOW_HINT_AFTER_MS)
    const t2 = setTimeout(() => setShowEscapeHatch(true), ESCAPE_HATCH_AFTER_MS)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  useEffect(() => {
    if (!minElapsed) return
    if (missingPrompts) return
    if (!allReady && !timedOut && !userForcedContinue) return
    const t = setTimeout(() => router.push(`/challenge/${audience}/beat-1`), 400)
    return () => clearTimeout(t)
  }, [
    minElapsed,
    allReady,
    timedOut,
    userForcedContinue,
    router,
    audience,
    missingPrompts,
  ])

  // The step ticker is choreography (one step per 2s), not real pipeline
  // state — left alone it hit 100% in ~16s while generation can run to the
  // 75s hard timeout, leaving the user staring at a full ring wondering if
  // the page is broken. Hold the ring at 94% until everything is actually
  // ready; the last 6% is the truth.
  const tickerPercent = ((activeStep + 1) / processingSteps.length) * 100
  const progressPercent = allReady ? 100 : Math.min(tickerPercent, 94)

  if (missingPrompts) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="s-card-static animate-fade-in-up w-full max-w-md p-8 text-center">
          <h2 className="mb-3 font-serif text-[24px] leading-snug text-ink">
            Content not yet
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
    <div className="relative flex h-svh flex-col items-center justify-center overflow-hidden px-5">
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

      <div className="page-enter relative z-10 grid w-full max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_minmax(0,430px)] lg:gap-14">
        {/* ── LEFT: the progress core ── */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
            {/* Progress ring - uses signal for the active stroke */}
            <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
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
                <span className="font-serif text-[24px] tabular-nums text-ink sm:text-[28px]">
                  {Math.round(progressPercent)}%
                </span>
              </div>
            </div>

            <div>
              <p className="eyebrow mb-2.5 text-foreground/70">
                The mirror is being built
              </p>
              <h1 className="font-serif text-[24px] leading-tight text-ink sm:text-[30px]">
                What you shared is being read
                <span className="block font-serif-italic text-foreground">
                  carefully.
                </span>
              </h1>
            </div>
          </div>

          {/* Current step - one live line with a counter, never a tall list */}
          <div className="mt-7 flex min-h-12 w-full max-w-md items-center gap-3 rounded-md border border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--signal) 20%, transparent)" }}
            >
              <span className="pulse-dot" aria-hidden />
            </span>
            <span
              key={activeStep}
              className="animate-fade-in-up min-w-0 flex-1 text-left text-[14px] leading-snug text-ink"
              aria-live="polite"
            >
              {processingSteps[activeStep]}
            </span>
            <span className="shrink-0 text-[10px] uppercase tabular-nums tracking-[0.18em] text-foreground/50">
              {Math.min(activeStep + 1, processingSteps.length)} / {processingSteps.length}
            </span>
          </div>

          {/* Cycling fragments of their own answers - fixed height so the
              swap never reflows the layout */}
          {wordEchoes.length > 0 && (
            <div className="mt-5 flex min-h-16 w-full max-w-md flex-col items-center justify-center text-center lg:items-start lg:text-left">
              <p
                key={echoIdx}
                className="animate-fade-in-up font-serif text-[15px] leading-[1.6] text-ink/90"
              >
                &ldquo;{wordEchoes[echoIdx]}&rdquo;
              </p>
              <p className="mt-1.5 text-[10px] uppercase tracking-[0.24em] text-foreground/50">
                Your words, being read
              </p>
            </div>
          )}

          {/* The four dimensions filling in sequence - progress
              choreography, not live scores: no numbers shown */}
          <div className="mt-6 flex items-start gap-4 sm:gap-6">
            {DIMENSION_ORDER.map((k, i) => {
              const frac = Math.max(0, Math.min(1, (progressPercent / 100) * 4 - i))
              const meta = display.pillarLabels[k]
              return (
                <div key={k} className="flex w-16 flex-col items-center gap-2 text-center">
                  <ScoreRing
                    value={frac * 100}
                    size={44}
                    stroke={4}
                    color={DIMENSION_COLORS[k]}
                    animate={false}
                    trackOpacity={0.3}
                  >
                    {frac >= 1 && (
                      <Check className="h-3.5 w-3.5 text-ink" strokeWidth={2} aria-hidden />
                    )}
                  </ScoreRing>
                  <span className="text-[8.5px] uppercase leading-tight tracking-[0.14em] text-foreground/55">
                    {meta.label}
                  </span>
                </div>
              )
            })}
          </div>

          {showClosingLine && (
            <p className="animate-curtain-rise mt-6 max-w-md font-serif-italic text-[16px] leading-snug text-ink sm:text-[17px]">
              What you are about to see could only have been built from your
              words.
            </p>
          )}
        </div>

        {/* ── RIGHT: the artifact, visibly assembling (desktop) ── */}
        <div className="hidden lg:block">
          <MacWindow title="your-score.pdf · assembling">
            <AssemblingReport progress={progressPercent} display={display} />
          </MacWindow>
          <p className="mt-3 text-center text-[10.5px] uppercase tracking-[0.18em] text-foreground/50">
            Being written from your words - nothing here is a template
          </p>
        </div>
      </div>

      {/* Slow-network banner - fixed at the viewport bottom so it's always
          visible regardless of how tall the centered checklist column has
          grown. Testers reported the previous inline placement was below
          the fold on standard laptop screens. */}
      {!allReady && (showSlowHint || showEscapeHatch) && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/85 px-5 py-3 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-500 sm:py-4"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 sm:flex-row sm:gap-4">
            <p className="flex items-center gap-2 text-center text-[12px] uppercase tracking-[0.2em] text-foreground/70 sm:text-left">
              <span className="pulse-dot" aria-hidden />
              {showEscapeHatch
                ? "Still working - taking longer than usual."
                : "Still working - your network is taking a moment."}
            </p>
            {showEscapeHatch && (
              <button
                type="button"
                onClick={() => setUserForcedContinue(true)}
                className="shrink-0 rounded-full border border-foreground/40 px-5 py-1.5 text-[11px] uppercase tracking-[0.2em] text-foreground transition-colors duration-300 hover:border-ink hover:text-ink"
              >
                Continue with what we have
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
