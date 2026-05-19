"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowLeft, Mic, MicOff, Lightbulb, Check } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useChallenge, type Audience, type ChallengeState } from "@/context/challenge-context"
import { submitToGoogleSheet } from "@/lib/submit-to-google-sheet"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import { ChallengeMenuButton } from "@/components/challenge/challenge-funnel-header-actions"
import { PrivacyNotice } from "@/components/privacy-notice"

interface QuestionScreenProps {
  audience: Audience
  questionNumber: 1 | 2 | 3 | 4 | 5
  stageFraming: string
  question: string
  prompt: string
  hintBox: string
  placeholder: string
  quoteZone: string
  backgroundImage: string
  /**
   * Descriptive alt text for the hero image — fall back to a generic
   * default if the page doesn't pass one. Used by search engines and
   * answer-engine crawlers to understand each question's theme.
   */
  imageAlt?: string
  nextRoute: string
  prevRoute: string
  /**
   * True when the underlying prompt for this audience is missing in the DB.
   * Renders an empty-state instead of the question form.
   */
  isMissing?: boolean
}

export function QuestionScreen({
  audience,
  questionNumber,
  stageFraming,
  question,
  prompt,
  hintBox,
  placeholder,
  quoteZone,
  backgroundImage,
  imageAlt,
  nextRoute,
  prevRoute,
  isMissing = false,
}: QuestionScreenProps) {
  const router = useRouter()
  const { state, setResponse, setStep } = useChallenge()
  const responseKey = `question${questionNumber}` as keyof ChallengeState["responses"]
  const [answer, setAnswer] = useState(state.responses[responseKey] || "")
  const [isNavigating, setIsNavigating] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechInterim, setSpeechInterim] = useState("")
  const [speakSupported, setSpeakSupported] = useState(true)
  const [isFocused, setIsFocused] = useState(false)
  const hasSetStep = useRef(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Voice-input state refs - required to fix three independent Android Chrome
  // bugs documented at the bottom of this file. See `buildRecognition` for
  // why each ref exists; do not collapse into local state.
  const baseTextRef = useRef("")           // textarea contents before mic was tapped
  const sessionFinalRef = useRef("")       // accumulated finals across restart cycles
  const cycleFinalRef = useRef("")         // current cycle's final transcript
  const wantListeningRef = useRef(false)   // true while user wants mic on

  useEffect(() => {
    if (!hasSetStep.current) {
      hasSetStep.current = true
      setStep(questionNumber)
    }
  }, [questionNumber, setStep])

  useEffect(() => {
    setSpeakSupported(
      typeof window !== "undefined" &&
        ("webkitSpeechRecognition" in window || "SpeechRecognition" in window),
    )
  }, [])

  // Auto-resize textarea so it grows with the answer.
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.max(140, textareaRef.current.scrollHeight)}px`
    }
  }, [answer])

  // First-paint scroll: keep the textarea visible. Without this the input
  // starts below the fold on mobile and ~29% of users never type a word.
  useEffect(() => {
    if (!textareaRef.current) return
    const t = window.setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 500)
    return () => window.clearTimeout(t)
  }, [])

  /**
   * Build a fresh SpeechRecognition instance. We MUST construct a new
   * instance on every cycle (initial start AND every onend auto-restart)
   * because Android Chrome's `event.results` array does not reliably
   * reset across `start()` calls on the same instance - previous-cycle
   * finals leak in and accumulate. See Bug 2 below.
   *
   * Inferred return type by design - adding an explicit annotation forces
   * a reference to the project's pre-existing tolerated `SpeechRecognition`
   * Window declaration and produces a new TS error.
   */
  const buildRecognition = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) throw new Error("SpeechRecognition unavailable")
    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onstart = () => {
      setSpeechInterim("")
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Bug 3 fix: Android Chrome emits multiple progressively-longer
      // FINAL results inside the same event.results for ONE utterance
      // ("what" → "what do" → "what do you" → …). Naive concatenation
      // produces the cascading-prefix duplication. We dedupe by collapsing
      // adjacent finals that are prefixes of each other and keeping the
      // longer.
      let interimTranscript = ""
      const dedupedFinals: string[] = []
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (!event.results[i].isFinal) {
          interimTranscript += transcript
          continue
        }
        const trimmed = transcript.trim()
        if (!trimmed) continue
        const last = dedupedFinals[dedupedFinals.length - 1]
        const lastTrimmed = last?.trim() ?? ""
        if (
          lastTrimmed &&
          (trimmed.startsWith(lastTrimmed) || lastTrimmed.startsWith(trimmed))
        ) {
          // Same utterance refining itself - keep the longer.
          dedupedFinals[dedupedFinals.length - 1] =
            trimmed.length >= lastTrimmed.length ? transcript : last
        } else {
          // Genuinely separate utterance (desktop continuous mode emits
          // one of these per natural pause).
          dedupedFinals.push(transcript)
        }
      }
      let cycleFinal = ""
      for (const t of dedupedFinals) cycleFinal += t.trim() + " "
      cycleFinalRef.current = cycleFinal

      // Build the answer absolutely - base + session + cycle. NEVER append
      // (`prev => prev + final`); appending was the original bug because
      // Android Chrome's prefix-cascade gets concatenated multiple times.
      const base = baseTextRef.current
      const session = sessionFinalRef.current
      const needsSep =
        base.length > 0 &&
        !/\s$/.test(base) &&
        (session.length > 0 || cycleFinal.length > 0)
      const sep = needsSep ? " " : ""
      setAnswer(base + sep + session + cycleFinal)
      setSpeechInterim(interimTranscript)
    }

    recognition.onerror = (event: Event) => {
      const code = (event as { error?: string }).error
      if (
        code === "not-allowed" ||
        code === "service-not-allowed" ||
        code === "audio-capture"
      ) {
        // Permission denied / mic busy - stop trying. User has to clear
        // the denial in browser settings; there's no programmatic re-prompt.
        wantListeningRef.current = false
      }
      // Other errors (no-speech, network, aborted) fall through to onend
      // and the auto-restart logic.
    }

    recognition.onend = () => {
      // Commit this cycle's final transcript to the session aggregate
      // before discarding the instance - otherwise the next cycle starts
      // fresh and we lose what was just transcribed.
      sessionFinalRef.current += cycleFinalRef.current
      cycleFinalRef.current = ""

      if (!wantListeningRef.current) {
        setSpeechInterim("")
        setIsListening(false)
        return
      }

      // Bug 1 + Bug 2 fix: `continuous = true` is silently ignored on
      // mobile Chrome - the engine ends after ~10s of silence even though
      // we asked for continuous. Auto-restart by building a fresh instance
      // (never re-call start() on the same object). The 100ms delay lets
      // the engine fully tear down before a new start, preventing
      // InvalidStateError on some Android builds.
      window.setTimeout(() => {
        if (!wantListeningRef.current) return
        try {
          const fresh = buildRecognition()
          recognitionRef.current = fresh
          fresh.start()
        } catch {
          wantListeningRef.current = false
          setIsListening(false)
          setSpeechInterim("")
        }
      }, 100)
    }

    return recognition
  }, [])

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input is not supported in this browser. Please use your keyboard.")
      return
    }

    // Snapshot the textarea BEFORE the mic was tapped so subsequent
    // absolute reconstructions in onresult always know the prefix.
    baseTextRef.current = answer
    sessionFinalRef.current = ""
    cycleFinalRef.current = ""
    wantListeningRef.current = true

    try {
      const recognition = buildRecognition()
      recognitionRef.current = recognition
      recognition.start()
    } catch {
      wantListeningRef.current = false
      setIsListening(false)
    }
  }, [answer, buildRecognition])

  const stopListening = useCallback(() => {
    // wantListeningRef = false MUST happen before .stop() so onend knows
    // not to auto-restart this cycle.
    wantListeningRef.current = false
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        /* already stopped */
      }
    }
    setSpeechInterim("")
    setIsListening(false)
  }, [])

  // Cleanup - abort any in-flight recognition if the user navigates away
  // mid-recording. Without this the mic stays hot in the background.
  useEffect(() => {
    return () => {
      wantListeningRef.current = false
      const r = recognitionRef.current
      if (r) {
        try {
          r.abort()
        } catch {
          /* already stopped */
        }
      }
    }
  }, [])

  const voiceLabelIdle =
    questionNumber === 5 ? "Describe your day aloud" : "Tap to speak"

  const toggleVoice = () => {
    if (isListening) stopListening()
    else startListening()
  }

  const handleNext = async () => {
    if (isNavigating) return
    if (!answer.trim()) return
    setIsNavigating(true)
    try {
      setResponse(responseKey, answer)
      if (state.serialNumber) {
        void submitToGoogleSheet({
          action: "answer",
          firstName: state.firstName,
          email: state.email.trim(),
          audience,
          serialNumber: state.serialNumber,
          questionNumber,
          answer,
          questionText: question,
        })
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
      router.push(nextRoute)
    } catch (e) {
      console.error("[QuestionScreen] navigation failed", e)
    } finally {
      setIsNavigating(false)
    }
  }

  const handleBack = () => {
    setResponse(responseKey, answer)
    router.push(prevRoute)
  }

  const progressDots = [1, 2, 3, 4, 5]

  if (isMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="s-card-static animate-fade-in-up w-full max-w-md p-8 text-center">
          <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-ink">
            <Lightbulb className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <h2 className="mb-3 font-serif text-[24px] leading-snug text-ink">
            {audience === "team" ? "Team content" : "Content"} not yet
            <span className="block font-serif-italic">configured.</span>
          </h2>
          <p className="mb-7 text-[15px] leading-[1.75] text-foreground/80">
            The {audience} version of question {questionNumber} hasn&apos;t been seeded
            yet. An admin needs to upload prompts before this audience can take
            the diagnostic.
          </p>
          <a href="/" className="s-btn">
            Back to home
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Fixed editorial nav with progress reading */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-border bg-background/85 px-5 backdrop-blur-xl sm:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ChallengeMenuButton />
          <span className="pulse-dot ml-1" aria-hidden />
        </div>

        <div
          className="flex items-center gap-1.5 sm:gap-2"
          role="progressbar"
          aria-valuenow={questionNumber}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-label={`Question ${questionNumber} of 5`}
        >
          {progressDots.map((dot, idx) => (
            <div key={dot} className="flex items-center gap-1.5 sm:gap-2">
              {dot < questionNumber ? (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-background transition-all duration-500"
                  aria-hidden
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                </span>
              ) : dot === questionNumber ? (
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-ink font-serif text-[10px] text-background ring-4 ring-ink/15 transition-all duration-500"
                  aria-hidden
                >
                  {dot}
                </span>
              ) : (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-border transition-all duration-500"
                  aria-hidden
                >
                  <span className="h-1 w-1 rounded-full bg-foreground/40" />
                </span>
              )}
              {idx < progressDots.length - 1 && (
                <span
                  className={`hidden h-px w-4 transition-all duration-500 sm:block ${
                    dot < questionNumber ? "bg-ink" : "bg-border"
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
            Question {questionNumber} · 5
          </span>
        </div>
      </header>

      {/* Two-column on desktop: input left (sticky), media right.
          On mobile the media renders first so the visual narrative is intact. */}
      <main className="flex-1 pt-20 sm:pt-24">
        <div className="px-5 sm:px-8 pb-8">
          <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-8 md:grid-cols-[1.1fr_1fr] md:gap-14">
            {/* LEFT - question + textarea + mic */}
            <div className="animate-fade-in-up md:sticky md:top-24 md:self-start">
              <p className="eyebrow mb-5 flex items-center gap-3 text-foreground/70">
                <span className="h-px w-6 bg-foreground/40" aria-hidden />
                {stageFraming}
              </p>

              <h1 className="mb-5 whitespace-pre-line font-serif text-[1.5rem] leading-[1.2] text-ink sm:text-[28px] sm:leading-[1.15] md:text-[32px]">
                {question}
              </h1>

              <p className="mb-7 whitespace-pre-line text-[15px] leading-[1.8] text-foreground/85">
                {prompt}
              </p>

              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={placeholder}
                  className={`s-input min-h-36 resize-none p-4 font-sans text-[16px] leading-[1.7] transition-all duration-300 ${
                    isFocused ? "border-ink" : ""
                  }`}
                />
              </div>

              {(isListening || speechInterim) && (
                <div
                  className="mt-3 min-h-12 rounded-md border border-dashed border-foreground/30 bg-secondary/40 px-5 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <p className="eyebrow mb-1 text-foreground/65">Live transcript</p>
                  <p className="font-sans text-[16px] leading-relaxed">
                    {speechInterim ? (
                      <span className="font-serif-italic text-foreground/75">
                        {speechInterim}
                      </span>
                    ) : (
                      <span className="text-foreground/65">
                        Listening… speak now; text appears in the box above.
                      </span>
                    )}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={toggleVoice}
                disabled={!speakSupported}
                aria-pressed={isListening}
                aria-label={
                  isListening
                    ? "Stop voice input"
                    : `${voiceLabelIdle}. Your speech is converted to text in the answer above.`
                }
                className={`group mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border text-[12px] uppercase tracking-[0.22em] transition-all duration-500 ${
                  !speakSupported
                    ? "cursor-not-allowed border-border text-foreground/40"
                    : isListening
                      ? "border-ink bg-ink text-background"
                      : "border-foreground/40 text-ink hover:bg-ink hover:text-background hover:border-ink"
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-4 w-4" strokeWidth={1.6} aria-hidden />
                    Tap to stop
                    <span className="ml-1 flex gap-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                      <span
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                        style={{ animationDelay: "0.3s" }}
                      />
                    </span>
                  </>
                ) : (
                  <>
                    <Mic
                      className="h-4 w-4 transition-transform duration-500 group-hover:scale-110"
                      strokeWidth={1.6}
                      aria-hidden
                    />
                    {voiceLabelIdle}
                  </>
                )}
              </button>

              {!speakSupported && (
                <p className="mt-3 text-center text-[12px] text-foreground/65">
                  Voice typing needs a supported browser (Chrome/Edge). You can
                  still type your answer.
                </p>
              )}

              <p className="mt-5 text-center font-serif-italic text-[15px] leading-snug text-foreground/75">
                {questionNumber === 5
                  ? "Take your time - honest detail here changes what surfaces at the end."
                  : "Answer in your own words - continue when you are ready."}
              </p>

            </div>

            {/* RIGHT - image + quote + hint */}
            <div className="order-first flex flex-col gap-5 md:order-none">
              <figure className="relative">
                <div className="img-hover-zoom relative aspect-video w-full overflow-hidden rounded-md">
                  <Image
                    src={backgroundImage}
                    alt={imageAlt ?? `AIMerge clarity diagnostic — question ${questionNumber} of 5`}
                    fill
                    className="animate-ken-burns object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
                </div>
                <figcaption className="mt-3 flex items-center gap-3">
                  <span className="h-px w-8 bg-foreground/40" aria-hidden />
                  <span className="eyebrow text-foreground/65">
                    Question {questionNumber} · 5
                  </span>
                </figcaption>
              </figure>

              <blockquote className="border-l border-foreground/30 pl-5">
                <p className="font-serif-italic text-[18px] leading-snug text-ink">
                  &ldquo;{quoteZone}&rdquo;
                </p>
              </blockquote>

              <aside className="rounded-md border border-border bg-secondary/50 p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink">
                    <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                  </span>
                  <p className="text-[14.5px] leading-[1.75] text-foreground/85">
                    {hintBox}
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>

      {/* Navigation footer - single sticky band, calm hairline divider */}
      <footer className="sticky bottom-0 border-t border-border bg-background/85 px-5 py-4 backdrop-blur-xl sm:px-8 animate-fade-in-up">
        <div className="mx-auto flex max-w-5xl flex-col gap-2">
          <div className="flex items-center gap-3">
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

            <button
              type="button"
              onClick={handleNext}
              disabled={isNavigating || !answer.trim()}
              aria-label={
                questionNumber === 5
                  ? "Complete the reading"
                  : "Continue to next question"
              }
              className="s-btn group h-12 flex-1 justify-center"
            >
              {isNavigating ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
              ) : (
                <>
                  {questionNumber === 5 ? "Complete the reading" : "Continue"}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                    strokeWidth={1.6}
                  />
                </>
              )}
            </button>
          </div>
          <PrivacyNotice
            variant="compact"
            className="text-center sm:text-right"
          />
        </div>
      </footer>
    </div>
  )
}

// Web Speech API - minimal type declarations (the DOM lib does not ship these
// because the spec is still experimental).
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly [index: number]: { readonly transcript: string }
}
interface SpeechRecognitionResultsLike {
  readonly length: number
  readonly [index: number]: SpeechRecognitionResultLike
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultsLike
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onstart: ((event: Event) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: ((event: Event) => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
}
