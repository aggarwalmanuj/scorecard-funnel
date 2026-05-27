"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowLeft, Check, Volume2, Square } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useChallenge, type Audience, type ChallengeState } from "@/context/challenge-context"
import { submitToGoogleSheet } from "@/lib/submit-to-google-sheet"
import { preloadBeatAudio } from "@/lib/client/beat-audio-cache"
import { useAudioPlayback } from "@/hooks/use-audio-playback"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import { ChallengeMenuButton } from "@/components/challenge/challenge-funnel-header-actions"

interface BeatRevealScreenProps {
  audience: Audience
  beatNumber: 1 | 2 | 3 | 4 | 5
  title: string
  subtitle: string
  dynamicLabel?: string
  feedbackQuestion?: string
  backgroundImage: string
  /**
   * Descriptive alt text for the hero image. Pass a sentence that names
   * what the image actually shows plus the diagnostic concept it carries
   * (mirror, direction, noise, pattern, clarity) — search engines and LLMs
   * use this to understand the page topic.
   */
  imageAlt?: string
  nextRoute: string
  prevRoute: string
}

export function BeatRevealScreen({
  audience,
  beatNumber,
  title,
  subtitle,
  feedbackQuestion,
  backgroundImage,
  imageAlt,
  nextRoute,
  prevRoute,
}: BeatRevealScreenProps) {
  const router = useRouter()
  const { state } = useChallenge()
  const beatKey = `beat${beatNumber}` as keyof ChallengeState["beats"]
  const beatContent = state.beats[beatKey]

  // If the beat content was already in state at first mount, this navigation
  // is hitting a cached page - render fully instantly instead of replaying
  // the typewriter. Live-streamed first visits (content arrives in chunks)
  // still get the animated reveal.
  const isPreloadedRef = useRef(false)
  if (!isPreloadedRef.current) {
    isPreloadedRef.current = (beatContent?.trim().length ?? 0) > 40
  }
  const skipReveal = isPreloadedRef.current

  const [isRevealed, setIsRevealed] = useState(skipReveal)
  const [visibleTokenCount, setVisibleTokenCount] = useState(0)
  const [isComplete, setIsComplete] = useState(skipReveal)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pendingPartly, setPendingPartly] = useState(false)
  const [partlyReason, setPartlyReason] = useState("")
  const [isTransitioning, setIsTransitioning] = useState(false)

  // ── Beat audio (xAI Grok voice) ──
  // HTML5 audio playback via the shared Safari-safe hook. The previous
  // Web Audio API impl awaited the buffer before constructing the
  // AudioContext, dropping Safari's user-activation flag and leaving
  // the Listen button stuck on "Loading…" forever.
  const hasAutoplayedRef = useRef(false)
  const tokenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tokens = useMemo(() => {
    if (!beatContent?.trim()) return [] as string[]
    return beatContent.split(/(\s+)/).filter((t) => t.length > 0)
  }, [beatContent])

  const PARTLY_ID = "Partly - close enough"
  const feedbackOptions = [
    { id: "Yes - that is exactly it", label: "Yes - that is exactly it", glyph: "✓" },
    { id: PARTLY_ID, label: "Partly - close enough", glyph: "≈" },
    { id: "Not quite, but I am curious", label: "Not quite, but I am curious", glyph: "→" },
  ]

  useEffect(() => {
    if (skipReveal) {
      // Instant render path: show every token immediately and treat the
      // beat as already-complete. Subscribers to `isComplete` (audio
      // autoplay, feedback panel) light up on the next tick.
      setVisibleTokenCount(tokens.length)
      setIsComplete(true)
      setIsRevealed(true)
      setFeedback(null)
      setPendingPartly(false)
      setPartlyReason("")
      hasAutoplayedRef.current = false
      return
    }
    setVisibleTokenCount(0)
    setIsComplete(false)
    setFeedback(null)
    setPendingPartly(false)
    setPartlyReason("")
    setIsRevealed(false)
    hasAutoplayedRef.current = false
    const t = setTimeout(() => setIsRevealed(true), 80)
    return () => clearTimeout(t)
  }, [beatContent, skipReveal, tokens.length])

  const fetchBeatBytes = useCallback(async (): Promise<ArrayBuffer | null> => {
    const text = beatContent?.trim()
    if (!text) return null
    return preloadBeatAudio(beatNumber, text)
  }, [beatContent, beatNumber])

  const audio = useAudioPlayback({
    // Composite key so a different beatNumber with the same text still
    // mints a fresh blob URL (matches the cacheKey scheme in beat-audio-cache).
    cacheKey: `${beatNumber}::${beatContent ?? ""}`,
    fetchBytes: fetchBeatBytes,
    mimeType: "audio/mpeg",
    enabled: Boolean(beatContent?.trim()),
  })

  const isAudioPlaying = audio.isPlaying
  const isAudioLoading = audio.isLoading
  const isAudioBufferReady = audio.isReady

  const handlePlayBeatAudio = useCallback(() => {
    audio.toggle()
  }, [audio])

  useEffect(() => {
    // Cached/preloaded visits skip the per-token animation entirely - the
    // mount effect already filled in every token. Only the live-streamed
    // first visit runs the typewriter.
    if (skipReveal) return
    if (!isRevealed || tokens.length === 0) return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setVisibleTokenCount(i)
      if (i >= tokens.length) {
        clearInterval(id)
        tokenTimerRef.current = null
        setIsComplete(true)
      }
    }, 20)
    tokenTimerRef.current = id
    return () => {
      clearInterval(id)
      tokenTimerRef.current = null
    }
  }, [isRevealed, tokens, skipReveal])

  // Double-click anywhere on the reflection card to skip the typewriter
  // straight to the end. Why: testers found the 38ms-per-token pace too
  // slow on re-reads.
  const handleSkipReveal = () => {
    if (tokens.length === 0) return
    if (isComplete) return
    if (tokenTimerRef.current) {
      clearInterval(tokenTimerRef.current)
      tokenTimerRef.current = null
    }
    setVisibleTokenCount(tokens.length)
    setIsComplete(true)
  }

  // Warm the next route's bundle/data as soon as the page mounts so the
  // tap on the feedback button feels instantaneous - Next caches the RSC
  // payload and any data hooks it depends on. Cheap to call repeatedly,
  // and a no-op in static export builds.
  useEffect(() => {
    if (!nextRoute) return
    try {
      router.prefetch(nextRoute)
    } catch {
      /* ignore - prefetch is best-effort */
    }
  }, [router, nextRoute])

  // Opportunistic autoplay once the typewriter finishes and the audio
  // element is primed. Chrome typically allows it after page interaction;
  // Safari rejects with NotAllowedError, which the hook handles silently —
  // the Listen button remains visible as a manual fallback. Fires at most
  // once per beat (hasAutoplayedRef resets when beatContent changes).
  useEffect(() => {
    if (!isComplete) return
    if (!isAudioBufferReady) return
    if (hasAutoplayedRef.current) return
    if (isAudioPlaying) return
    hasAutoplayedRef.current = true
    audio.toggle()
  }, [isComplete, isAudioBufferReady, isAudioPlaying, audio])

  // `async` is required — the body below awaits the save before
  // navigating so feedback rows don't get dropped on slow connections.
  const submitFeedback = async (option: string, reason?: string) => {
    setFeedback(option)
    setIsTransitioning(true)

    // Kick the save off immediately, but DO NOT fire-and-forget. Testers
    // reported missing feedback rows; root cause is that the previous code
    // navigated 1200ms after dispatching the fetch, which can cancel the
    // request mid-flight on slower connections. We now race the save
    // against a generous max-wait so the user is never stranded if the
    // network is completely dead, but in the common path the write lands
    // before the transition begins.
    const TRANSITION_DELAY_MS = 1200
    const SAVE_MAX_WAIT_MS = 5000
    const minDelay = new Promise<void>((r) =>
      window.setTimeout(r, TRANSITION_DELAY_MS),
    )
    const savePromise =
      state.email?.trim() && state.serialNumber
        ? submitToGoogleSheet({
            action: "feedback",
            firstName: state.firstName,
            email: state.email.trim(),
            audience,
            serialNumber: state.serialNumber,
            beatNumber,
            feedback: reason?.trim() ? `${option} | ${reason.trim()}` : option,
          }).catch(() => false)
        : Promise.resolve(true)
    const saveWithCap = Promise.race<boolean>([
      savePromise,
      new Promise<boolean>((r) =>
        window.setTimeout(() => r(false), SAVE_MAX_WAIT_MS),
      ),
    ])

    await Promise.all([minDelay, saveWithCap])
    router.push(nextRoute)
  }

  const handleFeedback = (option: string) => {
    if (feedback || isTransitioning) return
    if (option === PARTLY_ID) {
      setPendingPartly(true)
      return
    }
    void submitFeedback(option)
  }

  const handlePartlyContinue = () => {
    if (feedback || isTransitioning) return
    void submitFeedback(PARTLY_ID, partlyReason)
  }

  const handleBack = () => router.push(prevRoute)

  const progressDots = [1, 2, 3, 4, 5]
  const revealFraction = tokens.length > 0 ? visibleTokenCount / tokens.length : 0
  const showTimeHint = tokens.length === 0 || revealFraction < 0.75

  return (
    <div className="flex min-h-screen flex-col">
      {/* Editorial nav with progress reading */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-border bg-background/85 px-5 backdrop-blur-xl sm:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ChallengeMenuButton />
          <span className="pulse-dot ml-1" aria-hidden />
        </div>

        <div
          className="flex items-center gap-1.5 sm:gap-2 select-none pointer-events-none"
          aria-label={`Reflection ${beatNumber} of 5`}
        >
          {progressDots.map((dot, idx) => (
            <div key={dot} className="flex items-center gap-1.5 sm:gap-2">
              {dot < beatNumber ? (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-background"
                  aria-hidden
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                </span>
              ) : dot === beatNumber ? (
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-ink font-serif text-[10px] text-background ring-4 ring-ink/15"
                  aria-hidden
                >
                  {dot}
                </span>
              ) : (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-border"
                  aria-hidden
                >
                  <span className="h-1 w-1 rounded-full bg-foreground/40" />
                </span>
              )}
              {idx < progressDots.length - 1 && (
                <span
                  className={`hidden h-px w-4 sm:block ${
                    dot < beatNumber ? "bg-ink" : "bg-border"
                  }`}
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-end gap-0.5 text-right">
          <ChallengeNavHome />
          <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">
            Reflection {beatNumber} · 5
          </span>
        </div>
      </header>

      <main className="flex-1 pt-20 sm:pt-24">
        {/* Image - atmospheric, ken-burns slow zoom */}
        <div className="px-5 sm:px-8 animate-fade-in-up">
          <div className="mx-auto max-w-2xl">
            <figure>
              <div className="img-hover-zoom relative aspect-video w-full overflow-hidden rounded-md">
                <Image
                  src={backgroundImage}
                  alt={imageAlt ?? `AIMerge clarity diagnostic — reflection ${beatNumber} of 5`}
                  fill
                  className="animate-ken-burns object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
              </div>
              <figcaption className="mt-3 flex items-center gap-3">
                <span className="h-px w-8 bg-foreground/40" aria-hidden />
                <span className="eyebrow text-foreground/65">
                  Reflection {beatNumber} · 5
                </span>
              </figcaption>
            </figure>
          </div>
        </div>

        {/* Reflection card */}
        <div className="px-5 sm:px-8 py-10 animate-curtain-rise">
          <div
            onDoubleClick={handleSkipReveal}
            title={!isComplete && tokens.length > 0 ? "Double-click to skip" : undefined}
            className={`mx-auto max-w-2xl rounded-md p-7 transition-all duration-700 sm:p-8 ${
              isComplete ? "border border-ink bg-card" : "s-card-static"
            } ${!isComplete && tokens.length > 0 ? "cursor-pointer" : ""}`}
          >
            <div
              className={`mb-3 transition-all duration-500 ${
                isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}
            >
              <h1 className="font-serif text-[1.45rem] leading-[1.22] text-ink sm:text-[26px] sm:leading-[1.2] md:text-[30px]">
                {title}
              </h1>
            </div>

            {/* Body - typewriter reveal */}
            <div className="min-h-16">
              <p className="font-sans text-[16.5px] leading-[1.85] text-foreground/90 whitespace-pre-wrap">
                {tokens.length === 0 ? (
                  <span className="flex flex-col gap-1 font-serif-italic text-foreground/65">
                    <span className="flex items-center gap-2">
                      <span className="pulse-dot" aria-hidden />
                      Composing your reflection…
                    </span>
                    {showTimeHint && (
                      <span className="ml-4 text-[13px] not-italic uppercase tracking-[0.18em] text-foreground/55">
                        Usually 20-40 seconds
                      </span>
                    )}
                  </span>
                ) : (
                  <>
                    {tokens.slice(0, visibleTokenCount).join("")}
                    {visibleTokenCount > 0 && visibleTokenCount < tokens.length ? (
                      <span
                        className="typewriter-cursor ml-0.5 inline-block h-[1.1em] w-px align-middle bg-ink"
                        aria-hidden
                      />
                    ) : null}
                  </>
                )}
              </p>
            </div>

            <div className="mt-5">
              {tokens.length > 0 && !isComplete && (
                <span className="flex flex-col gap-0.5 text-[12px] uppercase tracking-[0.18em] text-foreground/65">
                  <span className="flex items-center gap-2">
                    <span className="pulse-dot" aria-hidden />
                    Composing
                  </span>
                  {showTimeHint && (
                    <span className="ml-4 text-foreground/45">
                      Usually 20-40 seconds
                    </span>
                  )}
                </span>
              )}
              {isComplete && (
                <span className="flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-ink animate-in fade-in duration-500">
                  <Check className="h-3 w-3" strokeWidth={2} />
                  Your reflection
                </span>
              )}
            </div>

            {/* Subtitle reveals after body lands */}
            {isComplete && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="my-7 flex items-center gap-3" aria-hidden>
                  <span className="h-px flex-1 bg-foreground/15" />
                  <span className="h-1 w-1 rounded-full bg-foreground/30" />
                  <span className="h-px flex-1 bg-foreground/15" />
                </div>
                <p className="font-serif-italic text-[18px] leading-snug text-foreground/85">
                  {subtitle}
                </p>

                {/* xAI Grok voice playback for this beat */}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePlayBeatAudio}
                    disabled={isAudioLoading && !isAudioPlaying}
                    aria-label={
                      isAudioPlaying
                        ? "Stop listening to this reflection"
                        : "Listen to this reflection"
                    }
                    className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-ink transition-colors duration-300 hover:border-ink disabled:opacity-60"
                  >
                    {isAudioPlaying ? (
                      <>
                        <Square
                          className="h-3 w-3 fill-current"
                          strokeWidth={1.6}
                        />
                        Stop
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3.5 w-3.5" strokeWidth={1.6} />
                        {isAudioLoading ? "Loading…" : "Listen"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feedback - three editorial choices */}
        {isComplete && (
          <div className="px-5 sm:px-8 pb-10">
            <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-7 flex items-center gap-4">
                <span className="h-px flex-1 bg-border" />
                <span className="eyebrow text-foreground/70">Your response</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <h2 className="mb-6 font-serif text-[22px] leading-snug text-ink sm:text-[24px]">
                {feedbackQuestion}
              </h2>

              <div className="flex flex-col gap-3">
                {feedbackOptions.map((option) => {
                  const isSelected = feedback === option.id
                  const isPartlyPending = pendingPartly && option.id === PARTLY_ID
                  const highlight = isSelected || isPartlyPending
                  return (
                    <div key={option.id}>
                      <button
                        type="button"
                        onClick={() => handleFeedback(option.id)}
                        disabled={!!feedback || isTransitioning}
                        className={`group flex w-full items-center justify-between rounded-md px-5 py-4 text-left transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          highlight
                            ? "border border-ink bg-ink text-background"
                            : "s-card hover:-translate-y-0.5"
                        }`}
                      >
                        <span className="flex items-center gap-4">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif text-[15px] transition-all duration-500 ${
                              highlight
                                ? "bg-background/20 text-background"
                                : "bg-secondary text-ink group-hover:bg-ink group-hover:text-background"
                            }`}
                          >
                            {option.glyph}
                          </span>
                          <span
                            className={`font-serif text-[16px] transition-colors duration-500 ${
                              highlight ? "text-background" : "text-ink"
                            }`}
                          >
                            {option.label}
                          </span>
                        </span>
                        <ArrowRight
                          className={`h-3.5 w-3.5 transition-all duration-500 ${
                            highlight
                              ? "translate-x-0 opacity-100"
                              : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-70"
                          }`}
                          strokeWidth={1.6}
                        />
                      </button>

                      {/* Optional note for "Partly" */}
                      {isPartlyPending && !feedback && (
                        <div className="mt-3 ml-1 animate-in fade-in slide-in-from-top-1 duration-300">
                          <Textarea
                            value={partlyReason}
                            onChange={(e) => setPartlyReason(e.target.value)}
                            placeholder="What part didn't land?"
                            rows={2}
                            className="s-input resize-none"
                            aria-label="What part of the reflection didn't land for you? (optional)"
                          />
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-[0.2em] text-foreground/55">
                              Optional
                            </span>
                            <button
                              type="button"
                              onClick={handlePartlyContinue}
                              disabled={isTransitioning}
                              className="s-btn group h-10 px-5"
                            >
                              Continue anyway
                              <ArrowRight
                                className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                                strokeWidth={1.6}
                              />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Transition overlay between reflections */}
      {isTransitioning && beatNumber < 5 && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-500"
          role="status"
          aria-live="polite"
        >
          <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
            <p className="eyebrow mb-5 text-foreground/70">Continuing</p>
            <p className="font-serif text-[36px] leading-tight text-ink sm:text-[44px]">
              Reflection {beatNumber + 1}
              <span className="font-serif-italic text-foreground/55"> · 5</span>
            </p>
            <div className="mx-auto mt-7 h-px w-24 bg-gradient-to-r from-transparent via-ink to-transparent" />
          </div>
        </div>
      )}

      {/* Footer - calm hairline + ghost back button */}
      <footer className="sticky bottom-0 border-t border-border bg-background/85 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={handleBack}
            className="s-btn-ghost group h-12 px-5"
            aria-label="Back to previous step"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-translate-x-1"
              strokeWidth={1.6}
            />
            Back
          </button>
        </div>
      </footer>
    </div>
  )
}
