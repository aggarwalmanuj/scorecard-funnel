"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Sparkles, Volume2, Square, Loader2, Download } from "lucide-react"
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

/** Calls /api/challenge/score — used only as a fallback when no score was
 *  pre-generated during processing. */
async function fetchClarityScoreFresh(
  body: { firstName: string; responses: Record<string, string> },
  signal?: AbortSignal
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

/** Streams the SSE summary from /api/challenge/summary */
async function streamSummary(
  body: { firstName: string; beats: Record<string, string> },
  onDelta: (fullText: string) => void,
  signal?: AbortSignal
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
        } catch { /* ignore */ }
      }
    }
  }

  // Flush trailing buffer
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
      } catch { /* ignore */ }
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
  // Gates the scorecard details + the footer CTA. TODO: replace with a real
  // entitlement check once payment is wired up.
  const [unlocked, setUnlocked] = useState(false)

  // Audio playback — mirrors beat-reveal-screen pattern
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [isDownloadingAudio, setIsDownloadingAudio] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null)
  // Cache the raw TTS bytes so play + download share one network fetch.
  const audioBytesRef = useRef<ArrayBuffer | null>(null)
  const autoPlayedRef = useRef(false)

  // Cleanup Web Audio on unmount
  useEffect(() => {
    return () => {
      audioSourceRef.current?.stop()
      audioCtxRef.current?.close()
    }
  }, [])

  // Fetch TTS bytes for the current summary text. Reads from the in-memory
  // cache populated by the /processing screen first — when that pre-fetch
  // landed in time, playback starts with zero network latency. Falls back to
  // a live fetch otherwise.
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

  // Stub play handler — TTS is temporarily disabled; the button just
  // toggles a "running" state for visual feedback. No network calls,
  // no audio playback. Replace with handleRealPlayAudio when ready.
  const handlePlayAudio = async () => {
    setIsPlaying((prev) => !prev)
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
      const safeName = (state.firstName || "your")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30) || "your"
      a.href = url
      a.download = `${safeName}-clarity-summary.mp3`
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Revoke after a tick so the browser has time to start the download.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error("Audio download error:", error instanceof Error ? error.message : String(error))
    } finally {
      setIsDownloadingAudio(false)
    }
  }

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Token-by-token display state (we stream directly by characters)
  const [visibleChars, setVisibleChars] = useState(0)
  const fullTextRef = useRef("")
  const charTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start char-reveal ticking
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
        return prev + 3 // reveal 3 chars per tick for a smooth feel
      })
    }, 18)
  }

  // Stream from API — but only if we don't already have a cached summary
  // pre-generated during /processing.  When the cache is present (the
  // common case after the new wait-for-everything processing flow), we
  // feed the typewriter from the cached text instead of opening a fresh
  // streaming connection.  This makes the summary page render
  // instantly AND removes the ECONNRESET noise that came from aborting an
  // in-flight upstream stream when the user navigated away.
  //
  // We MUST wait for `isHydrated` before deciding which path to take —
  // otherwise on a page refresh this effect runs before localStorage
  // rehydration finishes, observes an empty `state.summaryText`, and
  // wrongly falls through to the streaming path (regenerating the summary
  // and producing the ECONNRESET noise the cache was designed to avoid).
  useEffect(() => {
    if (!isHydrated) return

    fullTextRef.current = ""
    setVisibleChars(0)

    if (state.summaryText && state.summaryText.trim()) {
      // Fast path — replay typewriter from cache, no network call.
      fullTextRef.current = state.summaryText
      setSummaryText(state.summaryText)
      setIsStreaming(false)
      setIsComplete(true)
      startReveal()
      return
    }

    // Fallback path — original live-streaming behavior, used only if the
    // background pre-generation didn't land (slow upstream or user
    // bypassed the processing screen somehow).
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
      abort.signal
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

  // Show the CTA when streaming done AND text is fully displayed
  useEffect(() => {
    if (!isComplete) return
    const delay = hasFailed ? 200 : 800
    const t = setTimeout(() => setCtaVisible(true), delay)
    return () => clearTimeout(t)
  }, [isComplete, hasFailed])

  // Auto-play disabled while TTS is stubbed — the button toggles a
  // visual "playing" state only. Re-enable when real audio comes back.

  // Displayed text — only up to visibleChars
  const displayedText = useMemo(
    () => summaryText.slice(0, visibleChars),
    [summaryText, visibleChars]
  )

  // Split into lines/paragraphs for display
  const paragraphs = useMemo(
    () =>
      displayedText
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    [displayedText]
  )

  const isCursorVisible = isStreaming || visibleChars < summaryText.length

  // ── Clarity Readiness score ───────────────────────────────────────────
  // Prefer the snapshot pre-generated during the processing screen — that
  // is the same one the report uses, so numbers stay consistent. If for
  // some reason it's not in context yet, fall back to a fresh API call.
  const [clarity, setClarity] = useState<ClarityScore | null>(null)
  const [scoreSource, setScoreSourceState] = useState<ScoreSource>("pending")
  const [scoreReasons, setScoreReasons] = useState<ScoreReasons>({})
  const [nsState, setNsState] = useState<string | undefined>(undefined)

  useEffect(() => {
    // Cached snapshot — instant render, no LLM call.
    if (state.clarityScore) {
      setClarity(buildClarityScoreFromSubscores(state.clarityScore.subscores))
      setScoreReasons(state.clarityScore.reasons)
      setNsState(state.clarityScore.nsState)
      setScoreSourceState("llm")
      return
    }

    // Fallback path — only used if processing's background fetch hasn't
    // landed yet. Fires one fresh /api/challenge/score and caches it.
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
      abort.signal
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
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain"
      style={{
        background: "linear-gradient(160deg, #13102a 0%, #0a0718 60%, #10091f 100%)",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(139,124,246,0.3) transparent",
      }}
    >
      {/* Atmospheric particles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-[12%] left-[8%] w-1 h-1 rounded-full bg-[#8b7cf6]/40 animate-float" style={{ animationDelay: "0.2s" }} />
        <div className="absolute top-[25%] right-[12%] w-1.5 h-1.5 rounded-full bg-[#8b7cf6]/25 animate-float" style={{ animationDelay: "0.7s" }} />
        <div className="absolute bottom-[20%] left-[15%] w-1 h-1 rounded-full bg-[#8b7cf6]/30 animate-float" style={{ animationDelay: "1.1s" }} />
        <div className="absolute top-[60%] right-[20%] w-1 h-1 rounded-full bg-white/15 animate-float" style={{ animationDelay: "0.4s" }} />
        <div className="absolute bottom-[35%] left-[45%] w-2 h-2 rounded-full bg-[#8b7cf6]/15 animate-float" style={{ animationDelay: "0.9s" }} />
        {/* Blurred orbs */}
        <div className="absolute -top-16 left-1/4 w-72 h-72 rounded-full bg-[#8b7cf6]/6 blur-3xl animate-glow-pulse" />
        <div className="absolute -bottom-20 right-1/4 w-80 h-80 rounded-full bg-[#2d1b9e]/10 blur-3xl animate-glow-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Top accent bar */}
      <div
        className="sticky top-0 z-20 h-0.5 w-full"
        style={{
          background: "linear-gradient(90deg, transparent, #8b7cf6, #2d1b9e, #8b7cf6, transparent)",
        }}
      />

      {/* Full-page content */}
      <div
        className="relative min-h-screen flex flex-col"
        style={{
          transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)",
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(24px)",
        }}
      >
        <div className="flex-1 w-full max-w-none w-full px-5 sm:px-10 pt-10 sm:pt-14 pb-10">
          {/* Header */}
          <div
            style={{
              transition: "opacity 0.7s 0.3s, transform 0.7s 0.3s",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(16px)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl"
                style={{ background: "rgba(139,124,246,0.15)", border: "1px solid rgba(139,124,246,0.3)" }}
              >
                <Sparkles className="w-4 h-4 text-[#8b7cf6]" />
              </div>
              <span
                className="text-xs font-black uppercase tracking-[0.12em]"
                style={{ color: "rgba(139,124,246,0.8)" }}
              >
                Your Journey, Reflected
              </span>
            </div>

            <h1
              className="font-black tracking-tighter leading-tight mb-2"
              style={{
                fontSize: "clamp(24px, 4vw, 36px)",
                color: "#fafaf9",
              }}
            >
              {state.firstName ? `${state.firstName}, here is what surfaced.` : "Here is what surfaced."}
            </h1>

            <div
              className="h-px w-16 mb-8 rounded-full"
              style={{
                background: "linear-gradient(90deg, #8b7cf6, transparent)",
                transition: "opacity 0.5s 0.6s",
                opacity: isVisible ? 1 : 0,
              }}
            />
          </div>

          {/* 1. Clarity Readiness Index — scorecard FIRST. Reveals on initial
                mount (with glass morphism overlay) so it is visible
                immediately on reload, not after streaming completes. */}
          <div
            style={{
              transition:
                "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)",
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

          {/* 2. Big bold "Click here to listen" button */}
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
                    <Square className="w-5 h-5 fill-current" />
                    <span>Stop Listening</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-6 h-6" />
                    <span>Click Here to Listen</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="summary-audio-download-btn"
                onClick={handleDownloadAudio}
                disabled={isDownloadingAudio}
                aria-label="Download audio summary"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-[0.14em] transition-all duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
                style={{
                  background: "rgba(139,124,246,0.12)",
                  border: "1px solid rgba(139,124,246,0.3)",
                  color: "#b5a8ff",
                }}
              >
                {isDownloadingAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download Audio</span>
              </button>
            </div>
          )}

          {/* 3. Summary text — last */}
          <div className="mt-12 min-h-[120px]">
            {!summaryText && isStreaming && (
              <div className="flex items-center gap-3 mt-4">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#8b7cf6]"
                      style={{
                        animation: "pulse 1.2s ease-in-out infinite",
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </span>
                <span
                  className="text-sm font-sans"
                  style={{ color: "rgba(250,250,249,0.4)" }}
                >
                  Reading everything you shared...
                </span>
              </div>
            )}

            {hasFailed && !summaryText && (
              <p className="text-sm" style={{ color: "rgba(250,250,249,0.5)" }}>
                Something went wrong generating your summary. Please proceed to see your full results.
              </p>
            )}

            <div className="space-y-5">
              {paragraphs.map((para, idx) => (
                <p
                  key={idx}
                  className="font-sans leading-[1.85] text-base sm:text-[17px]"
                  style={{
                    color: "rgba(250,250,249,0.88)",
                    animation: "fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
                    animationDelay: `${idx * 80}ms`,
                  }}
                >
                  {para}
                  {/* Cursor only on last paragraph while streaming */}
                  {idx === paragraphs.length - 1 && isCursorVisible && (
                    <span
                      className="inline-block w-[2px] h-[1.1em] bg-[#8b7cf6] ml-0.5 align-middle rounded-full typewriter-cursor"
                      aria-hidden
                    />
                  )}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA — sticks to bottom of the page */}
        <div
          className="sticky bottom-0 z-10 w-full border-t"
          style={{
            borderColor: "rgba(139,124,246,0.15)",
            background: "rgba(10,7,24,0.85)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            transition: "opacity 0.7s, transform 0.7s",
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible ? "translateY(0)" : "translateY(12px)",
            pointerEvents: ctaVisible ? "auto" : "none",
          }}
        >
          <div className="w-full max-w-none w-full px-5 sm:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p
              className="text-sm font-sans text-center sm:text-left"
              style={{ color: "rgba(250,250,249,0.45)" }}
            >
              Five beats. One thread. The signal is clear.
            </p>

            <button
              type="button"
              id="summary-continue-btn"
              onClick={() =>
                unlocked
                  ? router.push(`/challenge/${audience}/offer`)
                  : router.push("/")
              }
              className="group relative flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-black text-[15px] text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: unlocked
                  ? "linear-gradient(135deg, #8b7cf6 0%, #6b5ee0 100%)"
                  : "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "0 0 0 0 rgba(139,124,246,0.4)",
                animation:
                  ctaVisible && unlocked
                    ? "attention-pulse 2.5s ease-out infinite"
                    : "none",
              }}
            >
              <span>{unlocked ? "See What Comes Next" : "Exit"}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
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
      className="rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(165deg, rgba(139,124,246,0.07) 0%, rgba(139,124,246,0.02) 70%)",
        border: "1px solid rgba(139,124,246,0.2)",
      }}
    >
      <div className="px-5 sm:px-7 py-8 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-[#8b7cf6]" />
        <span
          className="text-xs font-black uppercase tracking-[0.14em]"
          style={{ color: "rgba(139,124,246,0.85)" }}
        >
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
      className="rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(165deg, rgba(139,124,246,0.07) 0%, rgba(139,124,246,0.02) 70%)",
        border: "1px solid rgba(139,124,246,0.2)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 sm:px-7 pt-5 pb-4 border-b"
        style={{ borderColor: "rgba(139,124,246,0.15)" }}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: bandColor }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-[0.16em]"
              style={{ color: "rgba(139,124,246,0.85)" }}
            >
              Clarity Readiness Index
            </span>
          </div>
          {nsState && nsState !== "UNKNOWN" ? (
            <span
              className="text-[9.5px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(139,124,246,0.1)",
                border: "1px solid rgba(139,124,246,0.25)",
                color: "rgba(199,188,255,0.85)",
              }}
              title="Nervous-system state evidenced across your answers"
            >
              {nsState}
            </span>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span
              className="font-black tracking-tighter leading-none"
              style={{
                fontSize: "clamp(44px, 7vw, 64px)",
                color: "#fafaf9",
              }}
            >
              {clarity.overall}
            </span>
            <span
              className="font-sans font-semibold tracking-tight"
              style={{
                fontSize: "clamp(14px, 1.6vw, 16px)",
                color: "rgba(250,250,249,0.35)",
              }}
            >
              / 100
            </span>
          </div>

          <div
            className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.1em]"
            style={{
              background: `${bandColor}22`,
              border: `1px solid ${bandColor}55`,
              color: bandColor,
            }}
          >
            {clarity.bandLabel}
          </div>
        </div>

        <p
          className="mt-3 text-sm font-sans leading-relaxed"
          style={{ color: "rgba(250,250,249,0.75)" }}
        >
          {clarity.bandMessage}
        </p>
      </div>

      {/* Details (subscores + benchmark) — hidden behind a frosted glass overlay until unlocked.
          The blur is applied directly to the content container via `filter: blur()` (not
          `backdrop-filter`) so it is part of the element's first paint — no flash on reload. */}
      <div className="relative">
        {/* Blurred content. `filter` is applied atomically with the element's
            first paint, so the children never appear sharp before the blur lands. */}
        <div
          aria-hidden={!unlocked}
          style={{
            filter: !unlocked ? "blur(14px) saturate(120%)" : "none",
            transition: "filter 0.4s cubic-bezier(0.16,1,0.3,1)",
            pointerEvents: !unlocked ? "none" : "auto",
            userSelect: !unlocked ? "none" : "auto",
          }}
        >
          {/* Subscores */}
          <div className="px-5 sm:px-7 py-5 space-y-4">
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

          {/* Benchmark footer */}
          <div
            className="px-5 sm:px-7 py-4 border-t"
            style={{
              borderColor: "rgba(139,124,246,0.15)",
              background: "rgba(10,7,24,0.35)",
            }}
          >
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span
            className="text-[10px] font-black uppercase tracking-[0.14em]"
            style={{ color: "rgba(250,250,249,0.4)" }}
          >
            Peer benchmark
          </span>
          <span
            className="text-[11px] font-sans"
            style={{ color: "rgba(250,250,249,0.35)" }}
          >
            Estimated for leaders carrying unresolved clarity gaps
          </span>
        </div>
        <BenchmarkBar overall={clarity.overall} mean={clarity.benchmarkMean} />
        <p
          className="mt-6 text-sm font-sans leading-relaxed"
          style={{ color: "rgba(250,250,249,0.72)" }}
        >
          {clarity.comparisonLabel}
        </p>
        {source === "fallback" ? (
          <p
            className="mt-2 text-[11px] font-sans"
            style={{ color: "rgba(250,250,249,0.32)" }}
          >
            Offline estimate — full model scoring was unavailable.
          </p>
        ) : null}
          </div>
        </div>

        {/* Unlock overlay — sits on top of the (already-blurred) content with
            a soft glass tint and the Unlock button. */}
        {!unlocked ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(180deg, rgba(13,7,30,0.25) 0%, rgba(13,7,30,0.35) 100%)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <button
              type="button"
              onClick={onUnlock}
              className="px-6 py-3 rounded-full text-sm font-black uppercase tracking-[0.16em] transition-transform hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #8b7cf6, #6b5ee0)",
                color: "#fafaf9",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow:
                  "0 10px 30px rgba(139,124,246,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
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
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className="font-sans font-bold text-[13px] sm:text-sm truncate"
            style={{ color: "rgba(250,250,249,0.92)" }}
          >
            {label}
          </span>
          <span
            className="text-[10px] font-sans uppercase tracking-[0.12em]"
            style={{ color: "rgba(250,250,249,0.35)" }}
          >
            {pillar}
          </span>
        </div>
        <span
          className="font-black tabular-nums text-sm"
          style={{ color: barColor }}
        >
          {value}
        </span>
      </div>
      <div
        className="relative h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(139,124,246,0.08)" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.max(2, Math.min(100, value))}%`,
            background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
            transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
      {reason ? (
        <p
          className="mt-2 text-[12.5px] font-sans leading-snug"
          style={{ color: "rgba(250,250,249,0.55)" }}
        >
          {reason}
        </p>
      ) : null}
    </div>
  )
}

function BenchmarkBar({ overall, mean }: { overall: number; mean: number }) {
  return (
    <div
      className="relative h-2 rounded-full overflow-visible"
      style={{ background: "rgba(139,124,246,0.1)" }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${Math.max(2, Math.min(100, overall))}%`,
          background: "linear-gradient(90deg, #8b7cf6, #b5a8ff)",
          transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full"
        style={{
          left: `${mean}%`,
          background: "rgba(250,250,249,0.55)",
        }}
        aria-label={`Peer average: ${mean}`}
      />
      <div
        className="absolute -bottom-4 text-[9px] font-sans uppercase tracking-[0.1em] whitespace-nowrap"
        style={{
          left: `${mean}%`,
          transform: "translateX(-50%)",
          color: "rgba(250,250,249,0.4)",
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
      return "#8b7cf6"
    case "moderate":
      return "#c6a4f6"
    case "significant-gaps":
      return "#f6b37c"
    case "deep-stuck":
      return "#f68b8b"
  }
}

function subscoreColor(value: number): string {
  if (value >= 65) return "#8b7cf6"
  if (value >= 45) return "#c6a4f6"
  if (value >= 30) return "#f6b37c"
  return "#f68b8b"
}

