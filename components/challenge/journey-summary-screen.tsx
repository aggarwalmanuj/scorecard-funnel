"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Volume2, Square, Loader2, Download } from "lucide-react"
import { useChallenge, type Audience } from "@/context/challenge-context"
import { isAbortErrorLike } from "@/lib/stream-beat-client"
import {
  getCachedSummaryAudio,
  preloadSummaryAudio,
} from "@/lib/client/summary-audio-cache"
import {
  scoreClarity,
  buildClarityScoreFromSubscores,
  type ClarityScore,
  type Subscores,
} from "@/lib/scoring"

type ScoreSource = "llm" | "fallback" | "pending"
type ScoreReasons = Partial<Record<keyof Subscores, string>>

type LlmScoreResponse = {
  subscores: Subscores
  reasons: ScoreReasons
  nsState?: string
}

async function fetchClarityScoreFresh(
  body: { firstName: string; responses: Record<string, string> },
  signal?: AbortSignal,
): Promise<LlmScoreResponse | null> {
  try {
    const res = await fetch("/api/challenge/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok) return null
    const json = (await res.json()) as Partial<LlmScoreResponse>
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
  } catch (e) {
    if (isAbortErrorLike(e)) return null
    return null
  }
}

async function streamSummary(
  body: { firstName: string; beats: Record<string, string> },
  onDelta: (fullText: string) => void,
  signal?: AbortSignal,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let res: Response
  try {
    res = await fetch("/api/challenge/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (isAbortErrorLike(e)) return { ok: false, error: "aborted" }
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return { ok: false, error: text || `HTTP ${res.status}` }
  }

  const reader = res.body?.getReader()
  if (!reader) return { ok: false, error: "No response body" }

  const decoder = new TextDecoder()
  let carry = ""
  let full = ""

  while (true) {
    let chunk: ReadableStreamReadResult<Uint8Array>
    try {
      chunk = await reader.read()
    } catch (e) {
      if (isAbortErrorLike(e)) return { ok: false, error: "aborted" }
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
    const { done, value } = chunk
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
          if (typeof j.c === "string") {
            full += j.c
            onDelta(full)
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  const trailing = carry.trim()
  if (trailing) {
    for (const line of trailing.split("\n")) {
      if (!line.startsWith("data:")) continue
      const raw = line.slice(5).trim()
      try {
        const j = JSON.parse(raw) as { c?: string; done?: boolean }
        if (j.done) continue
        if (typeof j.c === "string") {
          full += j.c
          onDelta(full)
        }
      } catch {
        /* ignore */
      }
    }
  }

  return { ok: true }
}

export function JourneySummaryScreen({ audience }: { audience: Audience }) {
  const router = useRouter()
  const { state, setClarityScore, isHydrated } = useChallenge()

  const [summaryText, setSummaryText] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isDownloadingAudio, setIsDownloadingAudio] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const audioBytesRef = useRef<ArrayBuffer | null>(null)

  useEffect(() => {
    return () => {
      audioSourceRef.current?.stop()
      audioCtxRef.current?.close()
    }
  }, [])

  const fetchAudioBytes = async (): Promise<ArrayBuffer | null> => {
    if (audioBytesRef.current) return audioBytesRef.current
    if (!summaryText.trim()) return null
    const pending =
      getCachedSummaryAudio(summaryText) ?? preloadSummaryAudio(summaryText)
    const buffer = await pending
    if (!buffer) throw new Error("TTS request failed or returned empty buffer")
    audioBytesRef.current = buffer
    return buffer
  }

  // Real audio playback. The bytes are guaranteed to be ready by the time
  // this button is reachable — /processing blocks navigation to beat-1
  // (and therefore to /summary) until preloadSummaryAudio resolves. We
  // therefore never show a loading state; clicks either play instantly or
  // toggle off if already playing.
  const handlePlayAudio = async () => {
    if (isPlaying) {
      audioSourceRef.current?.stop()
      audioSourceRef.current = null
      setIsPlaying(false)
      return
    }
    if (!summaryText) return
    try {
      const buffer = await fetchAudioBytes()
      if (!buffer) return
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === "suspended") await ctx.resume()
      // decodeAudioData consumes the buffer in some implementations; clone
      // it so the cached bytes stay reusable for download / replay.
      const audioBuffer = await ctx.decodeAudioData(buffer.slice(0))
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      source.onended = () => {
        setIsPlaying(false)
        audioSourceRef.current = null
      }
      source.start(0)
      audioSourceRef.current = source
      setIsPlaying(true)
    } catch (error) {
      console.error(
        "Audio playback error:",
        error instanceof Error ? error.message : String(error),
      )
      setIsPlaying(false)
    }
  }

  const handleDownloadAudio = async () => {
    if (isDownloadingAudio) return
    if (!summaryText.trim()) return
    try {
      setIsDownloadingAudio(true)
      const buffer = await fetchAudioBytes()
      if (!buffer) return
      const blob = new Blob([buffer.slice(0)], { type: "audio/mpeg" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const safeName =
        (state.firstName || "your")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 30) || "your"
      a.href = url
      a.download = `${safeName}-clarity-summary.mp3`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error("Audio download error:", error instanceof Error ? error.message : String(error))
    } finally {
      setIsDownloadingAudio(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const [visibleChars, setVisibleChars] = useState(0)
  const fullTextRef = useRef("")
  const charTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startReveal = () => {
    if (charTimerRef.current) return
    charTimerRef.current = setInterval(() => {
      setVisibleChars((prev) => {
        const target = fullTextRef.current.length
        if (prev >= target) {
          if (charTimerRef.current) clearInterval(charTimerRef.current)
          charTimerRef.current = null
          return prev
        }
        return prev + 3
      })
    }, 18)
  }

  useEffect(() => {
    if (!isHydrated) return

    fullTextRef.current = ""
    setVisibleChars(0)

    if (state.summaryText && state.summaryText.trim()) {
      fullTextRef.current = state.summaryText
      setSummaryText(state.summaryText)
      setIsStreaming(false)
      setIsComplete(true)
      startReveal()
      return
    }

    const abort = new AbortController()
    setIsStreaming(true)

    void streamSummary(
      {
        firstName: state.firstName,
        beats: {
          beat1: state.beats.beat1,
          beat2: state.beats.beat2,
          beat3: state.beats.beat3,
          beat4: state.beats.beat4,
          beat5: state.beats.beat5,
        },
      },
      (full) => {
        fullTextRef.current = full
        setSummaryText(full)
        startReveal()
      },
      abort.signal,
    ).then((result) => {
      setIsStreaming(false)
      if (result.ok) {
        setIsComplete(true)
      } else if (result.error !== "aborted") {
        setHasFailed(true)
        setIsComplete(true)
      }
    })

    return () => {
      abort.abort()
      if (charTimerRef.current) clearInterval(charTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated])

  useEffect(() => {
    if (!isComplete) return
    const delay = hasFailed ? 200 : 800
    const t = setTimeout(() => setCtaVisible(true), delay)
    return () => clearTimeout(t)
  }, [isComplete, hasFailed])

  // Auto-play intentionally disabled. Browser autoplay policies block
  // unprompted playback without a user gesture, and the listen button is
  // a single tap away — keeping playback explicit avoids the silent-fail
  // edge case.

  const displayedText = useMemo(
    () => summaryText.slice(0, visibleChars),
    [summaryText, visibleChars],
  )

  const paragraphs = useMemo(
    () =>
      displayedText
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    [displayedText],
  )

  const isCursorVisible = isStreaming || visibleChars < summaryText.length

  // ── Clarity Readiness score ─────────────────────────────────────────
  const [clarity, setClarity] = useState<ClarityScore | null>(null)
  const [scoreSource, setScoreSourceState] = useState<ScoreSource>("pending")
  const [scoreReasons, setScoreReasons] = useState<ScoreReasons>({})
  const [nsState, setNsState] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (state.clarityScore) {
      setClarity(buildClarityScoreFromSubscores(state.clarityScore.subscores))
      setScoreReasons(state.clarityScore.reasons)
      setNsState(state.clarityScore.nsState)
      setScoreSourceState("llm")
      return
    }

    const abort = new AbortController()
    let cancelled = false
    setScoreSourceState("pending")

    void fetchClarityScoreFresh(
      {
        firstName: state.firstName,
        responses: {
          question1: state.responses.question1,
          question2: state.responses.question2,
          question3: state.responses.question3,
          question4: state.responses.question4,
          question5: state.responses.question5,
        },
      },
      abort.signal,
    ).then((result) => {
      if (cancelled) return
      if (result) {
        setClarity(buildClarityScoreFromSubscores(result.subscores))
        setScoreReasons(result.reasons)
        setNsState(result.nsState)
        setScoreSourceState("llm")
        setClarityScore({
          subscores: result.subscores,
          reasons: result.reasons,
          nsState: result.nsState,
        })
      } else {
        setClarity(scoreClarity(state.responses))
        setScoreReasons({})
        setNsState(undefined)
        setScoreSourceState("fallback")
      }
    })

    return () => {
      cancelled = true
      abort.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.clarityScore])

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto overscroll-contain"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "color-mix(in srgb, var(--signal) 40%, transparent) transparent",
      }}
    >
      {/* Atmospheric layers — palette-driven */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-16 left-1/4 h-72 w-72 rounded-full opacity-[0.18] blur-3xl animate-glow-pulse"
          style={{ background: "rgba(var(--glow), 0.5)" }}
        />
        <div
          className="absolute -bottom-20 right-1/4 h-80 w-80 rounded-full opacity-[0.12] blur-3xl animate-glow-pulse"
          style={{ background: "rgba(var(--glow), 0.4)", animationDelay: "2s" }}
        />
        <div
          className="absolute top-[28%] right-[14%] h-1.5 w-1.5 rounded-full opacity-50 animate-float"
          style={{ background: "var(--signal)", animationDelay: "0.6s" }}
        />
      </div>

      {/* Top accent line — palette signal */}
      <div
        className="sticky top-0 z-20 h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--signal), transparent)",
        }}
      />

      <div
        className="relative flex min-h-screen flex-col"
        style={{
          transition:
            "opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1)",
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(24px)",
        }}
      >
        <div className="w-full flex-1 px-5 pb-12 pt-12 sm:px-10 sm:pt-16">
          {/* Header */}
          <div
            style={{
              transition: "opacity 0.7s 0.3s, transform 0.7s 0.3s",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(16px)",
            }}
          >
            <p className="eyebrow mb-5 text-foreground/70">
              <span className="pulse-dot mr-3" aria-hidden />
              Your journey, reflected
            </p>

            <h1 className="font-serif text-[1.85rem] leading-[1.1] text-ink sm:text-[2.1rem] sm:leading-[1.06] md:text-[2.6rem]">
              {state.firstName ? `${state.firstName}, here is what` : "Here is what"}
              <span className="block font-serif-italic text-foreground">
                surfaced.
              </span>
            </h1>

            <div
              className="mt-7 h-px w-16"
              style={{
                background:
                  "linear-gradient(90deg, var(--signal), transparent)",
                transition: "opacity 0.5s 0.6s",
                opacity: isVisible ? 1 : 0,
              }}
            />
          </div>

          {/* 1. Clarity Readiness Index */}
          <div
            className="mt-12"
            style={{
              transition:
                "opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1)",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(14px)",
            }}
          >
            {clarity ? (
              <ClarityScoreCard
                clarity={clarity}
                source={scoreSource}
                reasons={scoreReasons}
                nsState={nsState}
                unlocked={unlocked}
                onUnlock={() => setUnlocked(true)}
              />
            ) : (
              <ClarityScorePending />
            )}
          </div>

          {/* 2. Listen button */}
          {summaryText && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <button
                type="button"
                id="summary-audio-btn"
                onClick={handlePlayAudio}
                aria-label={isPlaying ? "Stop audio" : "Click here to listen"}
                className="group relative w-full max-w-md flex items-center justify-center gap-3 px-8 py-4 sm:py-5 rounded-2xl font-black uppercase tracking-[0.14em] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  fontSize: "clamp(16px, 2.2vw, 20px)",
                  background: "linear-gradient(135deg, #fde047 0%, #f59e0b 100%)",
                  color: "#1a1306",
                  border: "1px solid rgba(255,255,255,0.35)",
                  boxShadow:
                    "0 18px 40px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.45)",
                  animation: !isPlaying
                    ? "attention-pulse 2.5s ease-out infinite"
                    : "none",
                }}
              >
                {isPlaying ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" strokeWidth={1.6} />
                    Stop listening
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" strokeWidth={1.6} />
                    Click here to listen
                  </>
                )}
              </button>

              <button
                type="button"
                id="summary-audio-download-btn"
                onClick={handleDownloadAudio}
                disabled={isDownloadingAudio}
                aria-label="Download audio summary"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-[10px] uppercase tracking-[0.22em] text-foreground/75 transition-colors duration-300 hover:border-ink hover:text-ink disabled:opacity-50"
              >
                {isDownloadingAudio ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.6} />
                ) : (
                  <Download className="h-3 w-3" strokeWidth={1.6} />
                )}
                Download audio
              </button>
            </div>
          )}

          {/* 3. Summary text */}
          <div className="mt-14 min-h-[120px]">
            {!summaryText && isStreaming && (
              <div className="mt-2 flex items-center gap-3">
                <span className="pulse-dot" aria-hidden />
                <span className="font-serif-italic text-[15px] text-foreground/65">
                  Reading everything you shared…
                </span>
              </div>
            )}

            {hasFailed && !summaryText && (
              <p className="text-[15px] font-serif-italic text-foreground/70">
                Something went wrong generating your summary. Please proceed to
                see your full results.
              </p>
            )}

            <div className="space-y-5 max-w-3xl">
              {paragraphs.map((para, idx) => (
                <p
                  key={idx}
                  className="font-serif text-[17px] leading-[1.85] text-foreground/90 sm:text-[18px]"
                  style={{
                    animation: "fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
                    animationDelay: `${idx * 80}ms`,
                  }}
                >
                  {para}
                  {idx === paragraphs.length - 1 && isCursorVisible && (
                    <span
                      className="typewriter-cursor ml-0.5 inline-block h-[1.1em] w-px align-middle bg-ink"
                      aria-hidden
                    />
                  )}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div
          className="sticky bottom-0 z-10 w-full border-t border-border bg-background/85 backdrop-blur-xl"
          style={{
            transition: "opacity 0.7s, transform 0.7s",
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible ? "translateY(0)" : "translateY(12px)",
            pointerEvents: ctaVisible ? "auto" : "none",
          }}
        >
          <div className="flex w-full flex-col items-center justify-between gap-4 px-5 py-5 sm:flex-row sm:px-10">
            <p className="font-serif-italic text-[14px] text-foreground/70 sm:text-left">
              Five reflections. One thread. The signal is clear.
            </p>

            <button
              type="button"
              id="summary-continue-btn"
              onClick={() =>
                unlocked
                  ? router.push(`/challenge/${audience}/offer`)
                  : router.push("/")
              }
              className={unlocked ? "s-btn group" : "s-btn-ghost group"}
            >
              {unlocked ? "See what comes next" : "Exit"}
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                strokeWidth={1.6}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Clarity Readiness Index card ----------

function ClarityScorePending() {
  return (
    <section
      aria-label="Clarity Readiness Index — scoring"
      className="s-card-static overflow-hidden"
    >
      <div className="flex items-center gap-3 px-6 py-9 sm:px-8">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-ink" strokeWidth={1.6} />
        <span className="eyebrow text-foreground/70">
          Scoring your Clarity Readiness Index…
        </span>
      </div>
    </section>
  )
}

function ClarityScoreCard({
  clarity,
  source,
  reasons,
  nsState,
  unlocked,
  onUnlock,
}: {
  clarity: ClarityScore
  source: ScoreSource
  reasons: ScoreReasons
  nsState?: string
  unlocked: boolean
  onUnlock: () => void
}) {
  const bandColor = bandAccent(clarity.band)

  return (
    <section
      aria-label="Clarity Readiness Index"
      className="overflow-hidden rounded-md border border-border bg-card"
    >
      <div className="border-b border-border px-6 pb-5 pt-6 sm:px-8">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="eyebrow flex items-center gap-2 text-foreground/70">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: bandColor }}
            />
            Clarity Readiness Index
          </p>
          {nsState && nsState !== "UNKNOWN" ? (
            <span
              className="rounded-full border border-border px-3 py-0.5 text-[10px] uppercase tracking-[0.2em] text-foreground/75"
              title="Nervous-system state evidenced across your answers"
            >
              {nsState}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span
              className="font-serif leading-none tabular-nums text-ink"
              style={{ fontSize: "clamp(48px, 7vw, 72px)" }}
            >
              {clarity.overall}
            </span>
            <span className="font-serif-italic text-foreground/55">/ 100</span>
          </div>

          <div
            className="rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em]"
            style={{
              background: `color-mix(in srgb, ${bandColor} 18%, transparent)`,
              border: `1px solid color-mix(in srgb, ${bandColor} 55%, transparent)`,
              color: bandColor,
            }}
          >
            {clarity.bandLabel}
          </div>
        </div>

        <p className="mt-4 font-serif-italic text-[16px] leading-[1.7] text-foreground/85">
          {clarity.bandMessage}
        </p>
      </div>

      <div className="relative">
        <div
          aria-hidden={!unlocked}
          style={{
            filter: !unlocked ? "blur(14px) saturate(120%)" : "none",
            transition: "filter 0.5s cubic-bezier(0.22,1,0.36,1)",
            pointerEvents: !unlocked ? "none" : "auto",
            userSelect: !unlocked ? "none" : "auto",
          }}
        >
          <div className="space-y-5 px-6 py-6 sm:px-8">
            {clarity.subscoreDetails.map((s) => (
              <SubscoreRow
                key={s.key}
                label={s.label}
                pillar={s.pillar}
                value={s.value}
                reason={reasons[s.key]}
              />
            ))}
          </div>

          <div className="border-t border-border bg-secondary/40 px-6 py-5 sm:px-8">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="eyebrow text-foreground/65">Peer benchmark</span>
              <span className="font-serif-italic text-[13px] text-foreground/65">
                Estimated for leaders carrying unresolved clarity gaps
              </span>
            </div>
            <BenchmarkBar overall={clarity.overall} mean={clarity.benchmarkMean} />
            <p className="mt-7 font-serif text-[15px] leading-[1.7] text-foreground/85">
              {clarity.comparisonLabel}
            </p>
            {source === "fallback" ? (
              <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-foreground/45">
                Offline estimate · full model scoring unavailable
              </p>
            ) : null}
          </div>
        </div>

        {!unlocked ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--background) 40%, transparent) 0%, color-mix(in srgb, var(--background) 60%, transparent) 100%)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button type="button" onClick={onUnlock} className="s-btn">
              Unlock
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function SubscoreRow({
  label,
  pillar,
  value,
  reason,
}: {
  label: string
  pillar: string
  value: number
  reason?: string
}) {
  const barColor = subscoreColor(value)
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="truncate font-serif text-[15px] text-ink">
            {label}
          </span>
          <span className="text-[10px] uppercase tracking-[0.22em] text-foreground/55">
            {pillar}
          </span>
        </div>
        <span
          className="tabular-nums font-serif text-[15px]"
          style={{ color: barColor }}
        >
          {value}
        </span>
      </div>
      <div
        className="relative h-1 overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--foreground) 8%, transparent)" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.max(2, Math.min(100, value))}%`,
            background: barColor,
            transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
      {reason ? (
        <p className="mt-2 text-[13px] leading-snug text-foreground/75">
          {reason}
        </p>
      ) : null}
    </div>
  )
}

function BenchmarkBar({ overall, mean }: { overall: number; mean: number }) {
  return (
    <div
      className="relative h-1.5 overflow-visible rounded-full"
      style={{ background: "color-mix(in srgb, var(--foreground) 8%, transparent)" }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${Math.max(2, Math.min(100, overall))}%`,
          background: "var(--signal)",
          transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
      <div
        className="absolute top-1/2 h-3 w-px -translate-y-1/2"
        style={{
          left: `${mean}%`,
          background: "var(--ink)",
        }}
        aria-label={`Peer average: ${mean}`}
      />
      <div
        className="absolute -bottom-5 whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-foreground/55"
        style={{
          left: `${mean}%`,
          transform: "translateX(-50%)",
        }}
      >
        avg {mean}
      </div>
    </div>
  )
}

function bandAccent(band: ClarityScore["band"]): string {
  switch (band) {
    case "high":
      return "#7cf6a8"
    case "good":
      return "#5fc5d4"
    case "moderate":
      return "#9bc8d8"
    case "significant-gaps":
      return "#f6c07c"
    case "deep-stuck":
      return "#f68b8b"
  }
}

function subscoreColor(value: number): string {
  if (value >= 65) return "#5fc5d4"
  if (value >= 45) return "#9bc8d8"
  if (value >= 30) return "#f6c07c"
  return "#f68b8b"
}
