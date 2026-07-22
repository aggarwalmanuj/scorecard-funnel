"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Volume2, Square, Loader2, Download } from "lucide-react"
import { useChallenge, type Audience } from "@/context/challenge-context"
import { displayFor } from "@/lib/vertical-display"
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
import {
  downloadArrayBufferAsFile,
  useAudioPlayback,
} from "@/hooks/use-audio-playback"
import {
  persistScore,
  persistReport,
  persistSummaryText,
  persistSummaryAudio,
} from "@/lib/persist-outputs"
import { track } from "@/lib/fbpixel"

type ScoreSource = "llm" | "fallback" | "pending"
type ScoreReasons = Partial<Record<keyof Subscores, string>>

type LlmScoreResponse = {
  subscores: Subscores
  reasons: ScoreReasons
  nsState?: string
}

async function fetchClarityScoreFresh(
  body: { firstName: string; audience: Audience; responses: Record<string, string> },
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
  body: { firstName: string; audience: Audience; beats: Record<string, string> },
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

  // Meta standard "CompleteRegistration" — the visitor finished the free
  // five-question assessment and reached their Belief Score. A strong
  // mid-funnel signal between Lead (signup) and InitiateCheckout/Purchase.
  // Once per browser session, keyed by serial so a refresh doesn't recount.
  const completeRegFiredRef = useRef(false)
  useEffect(() => {
    if (completeRegFiredRef.current || !isHydrated) return
    completeRegFiredRef.current = true
    try {
      const key = `fb-completereg:${state.serialNumber ?? "anon"}`
      if (sessionStorage.getItem(key)) return
      track("CompleteRegistration", {
        content_name: "belief-score-assessment",
        status: true,
      })
      sessionStorage.setItem(key, "1")
    } catch {
      track("CompleteRegistration", { content_name: "belief-score-assessment" })
    }
  }, [isHydrated, state.serialNumber])

  // HTML5 audio playback via the shared Safari-safe hook. Previous Web
  // Audio API impl broke on Safari macOS because `ctx.resume()` was
  // awaited after `fetchAudioBytes()` - by then the user-activation flag
  // had been dropped and Safari refused to start the context, leaving
  // the Listen button permanently stuck on "Preparing audio…".
  const fetchSummaryBytes = useCallback(async (): Promise<ArrayBuffer | null> => {
    if (!summaryText.trim()) return null
    const pending =
      getCachedSummaryAudio(summaryText) ?? preloadSummaryAudio(summaryText)
    return pending
  }, [summaryText])

  const audio = useAudioPlayback({
    cacheKey: summaryText,
    fetchBytes: fetchSummaryBytes,
    mimeType: "audio/mpeg",
    enabled: Boolean(summaryText.trim()),
  })

  const isPlaying = audio.isPlaying
  const isLoadingAudio = audio.isLoading
  const audioError = audio.error
  const [isDownloadingAudio, setIsDownloadingAudio] = useState(false)
  const hasAutoplayedRef = useRef(false)

  const handlePlayAudio = useCallback(() => {
    audio.toggle()
  }, [audio])

  const handleDownloadAudio = useCallback(() => {
    if (isDownloadingAudio) return
    const buffer = audio.getBytes()
    const safeName =
      (state.firstName || "your")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30) || "your"

    if (!buffer) {
      // Buffer hasn't arrived yet. Kick off a fetch and trigger the
      // download once it lands - but do NOT block this user gesture
      // with an await, since Safari needs the `a.click()` to dispatch
      // from inside the same task. Best UX: surface a brief loading
      // state and let the hook's preload finish, then re-prompt.
      setIsDownloadingAudio(true)
      void fetchSummaryBytes()
        .then((buf) => {
          downloadArrayBufferAsFile({
            buffer: buf,
            filename: `${safeName}-clarity-summary.mp3`,
          })
        })
        .finally(() => setIsDownloadingAudio(false))
      return
    }

    // Synchronous path - runs entirely inside the click gesture so
    // Safari permits the download dispatch.
    downloadArrayBufferAsFile({
      buffer,
      filename: `${safeName}-clarity-summary.mp3`,
    })
  }, [audio, fetchSummaryBytes, isDownloadingAudio, state.firstName])

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const [visibleChars, setVisibleChars] = useState(0)
  const fullTextRef = useRef("")
  const charTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Sticky skip flag - once set (by double-click), every subsequent stream
  // chunk renders instantly instead of restarting the typewriter.
  const skippedRef = useRef(false)

  const startReveal = () => {
    if (skippedRef.current) {
      setVisibleChars(fullTextRef.current.length)
      return
    }
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

  // Double-click anywhere on the summary text to skip the typewriter and
  // (for an in-flight stream) keep subsequent chunks rendering instantly.
  const handleSkipReveal = () => {
    skippedRef.current = true
    if (charTimerRef.current) {
      clearInterval(charTimerRef.current)
      charTimerRef.current = null
    }
    setVisibleChars(fullTextRef.current.length)
  }

  useEffect(() => {
    if (!isHydrated) return

    fullTextRef.current = ""
    setVisibleChars(0)
    skippedRef.current = false

    if (state.summaryText && state.summaryText.trim()) {
      // Summary was already streamed during /processing - render it in full
      // immediately instead of re-running the 3-char-per-18ms typewriter,
      // which would otherwise take 5-7s for a 200-word closing message.
      fullTextRef.current = state.summaryText
      setSummaryText(state.summaryText)
      setIsStreaming(false)
      setIsComplete(true)
      skippedRef.current = true
      setVisibleChars(state.summaryText.length)
      return
    }

    const abort = new AbortController()
    setIsStreaming(true)

    void streamSummary(
      {
        firstName: state.firstName,
        audience: state.audience ?? "main",
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

  // Front-load the TTS the instant the summary text is final, so the audio
  // bytes are generating/cached before autoplay (or the user's click) needs
  // them - this is what removes the "Preparing audio…" wait. Idempotent:
  // preloadSummaryAudio dedupes against the audio cache, so a later play just
  // reuses these bytes instead of starting a fresh round-trip.
  useEffect(() => {
    if (!isComplete) return
    const text = summaryText.trim()
    if (!text) return
    void preloadSummaryAudio(text)
  }, [isComplete, summaryText])

  // Warm the next route's bundle as soon as the page mounts. By the time
  // the CTA fades in and the user clicks it, Next has the RSC payload and
  // any data hooks pre-resolved - the navigation feels instant.
  useEffect(() => {
    if (!audience) return
    try {
      router.prefetch(`/challenge/${audience}/offer`)
    } catch {
      /* ignore - prefetch is best-effort */
    }
  }, [router, audience])

  // Attempt autoplay once the audio element is primed. Modern Chrome
  // allows it after the user's funnel interaction (the "Continue"
  // clicks that brought them here count as user activation for the
  // page). Safari ignores autoplay attempts on audio elements without
  // muted=true, so the call resolves with NotAllowedError and the
  // hook surfaces no error - the Listen button stays visible as a
  // manual fallback. The point of this effect is to *opportunistically*
  // start playback, never to gate UI on its success.
  useEffect(() => {
    if (!audio.isReady) return
    if (hasAutoplayedRef.current) return
    if (audio.isPlaying) return
    hasAutoplayedRef.current = true
    audio.toggle()
  }, [audio])

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

  // ── Belief Score ──────────────────────────────────────────
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
        audience: state.audience ?? "main",
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

  // ── Persist final outputs for admin review (best-effort, once each) ──
  // The summary screen is the single point every completer lands on with all
  // four artifacts available: the score, the pre-generated report, the
  // closing summary, and (once it loads) the summary audio. We capture each
  // exactly as the user received it. Each ref guards a single write; the
  // server overwrites idempotently if a later mount re-fires.
  const persistId = useMemo(
    () => ({
      serialNumber: state.serialNumber,
      firstName: state.firstName,
      email: state.email,
    }),
    [state.serialNumber, state.firstName, state.email],
  )
  const scoreSavedRef = useRef(false)
  const reportSavedRef = useRef(false)
  const summarySavedRef = useRef(false)
  const audioSavedRef = useRef(false)

  useEffect(() => {
    if (scoreSavedRef.current || !clarity || scoreSource === "pending") return
    scoreSavedRef.current = true
    persistScore(persistId, { clarity, reasons: scoreReasons, nsState, scoreSource })
  }, [clarity, scoreSource, scoreReasons, nsState, persistId])

  useEffect(() => {
    if (reportSavedRef.current || !state.reportData) return
    reportSavedRef.current = true
    persistReport(persistId, state.reportData)
  }, [state.reportData, persistId])

  useEffect(() => {
    if (summarySavedRef.current || !isComplete) return
    const text = summaryText || state.summaryText
    if (!text.trim()) return
    summarySavedRef.current = true
    persistSummaryText(persistId, text)
  }, [isComplete, summaryText, state.summaryText, persistId])

  useEffect(() => {
    if (audioSavedRef.current || !audio.isReady) return
    const bytes = audio.getBytes()
    if (!bytes) return
    audioSavedRef.current = true
    // Send a copy so forwarding the bytes can never detach the buffer the
    // audio element is still playing from.
    persistSummaryAudio(persistId, bytes.slice(0))
  }, [audio, persistId])

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto overscroll-contain"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "color-mix(in srgb, var(--signal) 40%, transparent) transparent",
      }}
    >
      {/* Atmospheric layers - palette-driven */}
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

      {/* Top accent line - palette signal */}
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
        <div className="mx-auto w-full max-w-3xl flex-1 px-5 pb-12 pt-12 sm:px-10 sm:pt-16">
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

          {/* 1. Belief Score */}
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
                audience={audience}
                unlocked={unlocked}
                onUnlock={() => {
                  // Navigate without flipping local `unlocked` state - flipping
                  // it triggers a re-render that paints the un-blurred content
                  // for a frame before the navigation completes, exposing the
                  // paid subscores to free users.
                  router.push(`/challenge/${audience}/offer`)
                }}
              />
            ) : (
              <ClarityScorePending audience={audience} />
            )}
          </div>

          {/* 2. Listen button */}
          {summaryText && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <button
                type="button"
                id="summary-audio-btn"
                onClick={handlePlayAudio}
                disabled={isLoadingAudio}
                aria-label={
                  isPlaying
                    ? "Stop audio"
                    : isLoadingAudio
                      ? "Preparing audio"
                      : "Listen to your summary"
                }
                className="group relative w-full max-w-md flex items-center justify-center gap-3 px-8 py-4 sm:py-5 rounded-2xl font-semibold uppercase tracking-[0.14em] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-90"
                style={{
                  fontSize: "clamp(16px, 2.2vw, 20px)",
                  // On-palette teal (the brand --signal accent) - vibrant and
                  // distinct, with navy text for crisp contrast. Replaces the
                  // off-brand amber/yellow gradient.
                  background:
                    "linear-gradient(135deg, var(--signal) 0%, color-mix(in srgb, var(--signal) 58%, var(--background)) 100%)",
                  color: "var(--background)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  boxShadow:
                    "0 18px 40px rgba(var(--glow), 0.42), inset 0 1px 0 rgba(255,255,255,0.4)",
                  animation:
                    !isPlaying && !isLoadingAudio
                      ? "attention-pulse 2.5s ease-out infinite"
                      : "none",
                }}
              >
                {isPlaying ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" strokeWidth={1.6} />
                    Stop listening
                  </>
                ) : isLoadingAudio ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />
                    Preparing audio…
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" strokeWidth={1.6} />
                    Listen to your summary
                  </>
                )}
              </button>

              {audioError && (
                <p
                  role="alert"
                  className="font-serif-italic text-[13px] text-destructive/90"
                >
                  {audioError}
                </p>
              )}

              <button
                type="button"
                id="summary-audio-download-btn"
                onClick={handleDownloadAudio}
                disabled={isDownloadingAudio || !audio.isReady}
                aria-label="Download audio summary"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-[10px] uppercase tracking-[0.22em] text-foreground/75 transition-colors duration-300 hover:border-ink hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloadingAudio || !audio.isReady ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.6} />
                ) : (
                  <Download className="h-3 w-3" strokeWidth={1.6} />
                )}
                {audio.isReady ? "Download audio" : "Preparing download…"}
              </button>
            </div>
          )}

          {/* 3. Summary text */}
          <div
            className={`mt-14 min-h-[120px] ${
              isCursorVisible && summaryText ? "cursor-pointer" : ""
            }`}
            onDoubleClick={handleSkipReveal}
            title={
              isCursorVisible && summaryText ? "Double-click to skip" : undefined
            }
          >
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

            {/* Visible skip for the typewriter — double-click (above) is
                undiscoverable and impossible on touch. */}
            {isCursorVisible && summaryText && (
              <button
                type="button"
                onClick={handleSkipReveal}
                className="mt-6 inline-flex min-h-11 items-center rounded-full border border-border px-4 text-[11px] uppercase tracking-[0.18em] text-foreground/70 transition-colors hover:border-foreground/40 hover:text-ink"
              >
                Show all
              </button>
            )}
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

// ---------- Belief Score card ----------

function ClarityScorePending({ audience }: { audience: Audience }) {
  const productName = displayFor(audience).productName
  return (
    <section
      aria-label={`${productName} - scoring`}
      className="s-card-static overflow-hidden"
    >
      <div className="flex items-center gap-3 px-6 py-9 sm:px-8">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-ink" strokeWidth={1.6} />
        <span className="eyebrow text-foreground/70">
          Calculating your {productName}…
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
  audience,
  unlocked,
  onUnlock,
}: {
  clarity: ClarityScore
  source: ScoreSource
  reasons: ScoreReasons
  nsState?: string
  audience: Audience
  unlocked: boolean
  onUnlock: () => void
}) {
  const bandColor = bandAccent(clarity.band)

  return (
    <section
      aria-label={displayFor(audience).productName}
      className="overflow-hidden rounded-md border border-border bg-card"
    >
      <div className="border-b border-border px-6 pb-5 pt-6 sm:px-8">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="eyebrow flex items-center gap-2 text-foreground/70">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: bandColor }}
            />
            {displayFor(audience).productName}
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
            {/* Labels resolve per vertical at render time (stored
                subscoreDetails keep the canonical main labels). */}
            {clarity.subscoreDetails.map((s) => {
              const meta = displayFor(audience).pillarLabels[s.key]
              return (
                <SubscoreRow
                  key={s.key}
                  label={meta?.label ?? s.label}
                  pillar={meta?.pillar ?? s.pillar}
                  value={s.value}
                  reason={reasons[s.key]}
                />
              )
            })}
          </div>

          <div className="border-t border-border bg-secondary/40 px-6 py-5 sm:px-8">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="eyebrow text-foreground/65">Peer benchmark</span>
              <span className="font-serif-italic text-[13px] text-foreground/65">
                Among professionals who take this assessment
              </span>
            </div>
            <BenchmarkBar overall={clarity.overall} mean={clarity.benchmarkMean} />
            <p className="mt-7 font-serif text-[15px] leading-[1.7] text-foreground/85">
              {clarity.comparisonLabel}
            </p>
            {source === "fallback" ? (
              // Internal degradation, phrased for a reader — never expose
              // "model scoring unavailable" on the number we ask them to
              // trust (and pay to unlock).
              <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-foreground/45">
                Preliminary score · refined in your full report
              </p>
            ) : null}
          </div>
        </div>

        {!unlocked ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center px-5 py-6 sm:px-8"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--background) 30%, transparent) 0%, color-mix(in srgb, var(--background) 55%, transparent) 100%)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div className="flex max-w-md flex-col items-center text-center">
              <p className="font-serif text-[15.5px] leading-[1.5] text-ink sm:text-[16.5px]">
                You can now see the loop.
                <span className="block font-serif-italic text-foreground">
                  You do not yet have the sequence for interrupting it.
                </span>
              </p>
              <button
                type="button"
                onClick={onUnlock}
                className="s-btn group mt-5 h-12 px-6 text-[12px]"
                style={{
                  background: "var(--signal)",
                  color: "var(--background)",
                  border:
                    "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
                  boxShadow:
                    "0 14px 40px -16px rgba(var(--glow), 0.55)",
                }}
              >
                Get My Personalized Action Plan
                <span
                  aria-hidden
                  className="ml-1 inline-block transition-transform duration-500 group-hover:translate-x-1"
                >
                  →
                </span>
              </button>
            </div>
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
