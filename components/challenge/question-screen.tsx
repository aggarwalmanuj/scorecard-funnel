"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowLeft, Mic, MicOff, Lightbulb, Check, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChallenge, type Audience, type ChallengeState } from "@/context/challenge-context"
import { submitToGoogleSheet } from "@/lib/submit-to-google-sheet"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import {
  ChallengeMenuButton,
} from "@/components/challenge/challenge-funnel-header-actions"

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

  useEffect(() => {
    if (!hasSetStep.current) {
      hasSetStep.current = true
      setStep(questionNumber)
    }
  }, [questionNumber, setStep])

  useEffect(() => {
    setSpeakSupported(
      typeof window !== "undefined" &&
        ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    )
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`
    }
  }, [answer])

  // Bug fix #1: on first paint the textarea sits below the fold on most
  // devices — users saw the Continue button before the input and 29% dropped
  // off without answering. Scroll the input into view once it's mounted.
  useEffect(() => {
    if (!textareaRef.current) return
    const t = window.setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 500)
    return () => window.clearTimeout(t)
  }, [])

  const clearVoiceUi = useCallback(() => {
    setSpeechInterim("")
    setIsListening(false)
  }, [])

  // Voice input setup (Chrome / Edge / Safari 14.1+ / Android Chrome)
  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input is not supported in this browser. Please use your keyboard.")
      return
    }

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) return
    const recognition = new Ctor()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onstart = () => {
      setSpeechInterim("")
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " "
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        setAnswer((prev) => prev + finalTranscript)
      }
      setSpeechInterim(interimTranscript)
    }

    recognition.onerror = () => {
      clearVoiceUi()
    }

    recognition.onend = () => {
      setSpeechInterim("")
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [clearVoiceUi])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setSpeechInterim("")
    setIsListening(false)
  }, [])

  const voiceLabelIdle =
    questionNumber === 5 ? "Describe your day aloud" : "Tap to speak"

  const toggleVoice = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
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
          // Snapshot the prompt text the user actually saw. Admins can edit
          // question copy at any time, so this is the only reliable record of
          // what the answer was responding to.
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
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="max-w-md w-full text-center bg-card rounded-2xl p-8 neu-card-primary animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-5">
            <Lightbulb className="w-6 h-6" />
          </div>
          <h2 className="font-black tracking-tight text-[22px] text-foreground mb-2">
            {audience === "team" ? "Team content" : "Content"} not yet configured
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
            The {audience} version of question {questionNumber} hasn&apos;t been seeded in the
            database yet. An admin needs to upload prompts via the admin page before this
            audience can take the diagnostic.
          </p>
          <Button asChild className="rounded-xl font-bold neu-border-primary neu-shadow-primary-xs neu-btn-press">
            <a href="/">Back to home</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Top Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl h-14 flex items-center px-5 sm:px-8 border-b-2 border-foreground/10 transition-all duration-300">
        <div className="flex-1 flex items-center gap-1 min-w-0">
          <ChallengeMenuButton />
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Colored%20%28Transparent%29-bv50Oy3VWMzhtF45BmSeOwOLdZcNoM.png"
            alt="Logo"
            width={100}
            height={28}
            className="h-6 w-auto"
          />
        </div>

        {/* Enhanced Progress Dots with Connectors */}
        <div className="flex items-center gap-1 sm:gap-1.5" role="progressbar" aria-valuenow={questionNumber} aria-valuemin={1} aria-valuemax={5} aria-label={`Question ${questionNumber} of 5`}>
          {progressDots.map((dot, idx) => (
            <div key={dot} className="flex items-center gap-1 sm:gap-1.5">
              {dot < questionNumber ? (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center transition-all duration-500 animate-pulse-ring">
                  <Check className="w-3 h-3 text-primary-foreground" aria-hidden />
                </div>
              ) : dot === questionNumber ? (
                <div className="w-7 h-7 rounded-full bg-primary ring-4 ring-primary/20 flex items-center justify-center transition-all duration-500">
                  <span className="text-[11px] font-black text-primary-foreground">{dot}</span>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-border bg-background flex items-center justify-center transition-all duration-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-border" />
                </div>
              )}
              {idx < progressDots.length - 1 && (
                <div className={`hidden sm:block w-4 h-0.5 rounded-full transition-all duration-500 ${
                  dot < questionNumber ? "bg-primary" : "bg-border"
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col items-end gap-0.5 text-right min-w-0">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <ChallengeNavHome />
          </div>
          <span className="text-[13px] text-muted-foreground">
            Stage {questionNumber} of 5
          </span>
        </div>
      </header>

      {/* Main Content — two-column on desktop: input left, media/hint right.
          On mobile the media column renders first (order-first) so users still
          see the image for context before answering; auto-scroll-to-textarea
          then centers the input in the viewport. */}
      <main className="flex-1 pt-14">
        <div className="px-5 sm:px-8 py-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-6 md:gap-10 items-start">
            {/* LEFT COLUMN — question text + input + mic */}
            <div className="animate-fade-in-left delay-200 md:sticky md:top-20 md:self-start">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-4 flex items-center gap-2">
                <span className="w-5 h-px bg-primary/40" />
                {stageFraming}
              </p>

              <h1 className="font-black tracking-tighter text-[24px] sm:text-[28px] text-foreground leading-[1.3] mb-4 whitespace-pre-line">
                {question}
              </h1>

              <div className="text-muted-foreground font-sans text-[15px] leading-[1.7] mb-6 whitespace-pre-line">
                {prompt}
              </div>

              <Textarea
                ref={textareaRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className={`min-h-30 p-4 text-[16px] font-sans bg-card rounded-xl resize-none placeholder:text-muted-foreground text-foreground transition-all duration-300 ${
                  isFocused
                    ? "border-2 border-primary ring-[3px] ring-primary/10 neu-shadow-primary-sm"
                    : "border-2 border-foreground/15 neu-shadow-xs"
                }`}
              />

              {(isListening || speechInterim) && (
                <div
                  className="mt-2 min-h-11 rounded-xl border-2 border-dashed border-primary/35 bg-secondary/30 px-5 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-1">
                    Live transcript
                  </p>
                  <p className="font-sans text-[16px] leading-relaxed text-foreground">
                    {speechInterim ? (
                      <span className="text-muted-foreground italic">{speechInterim}</span>
                    ) : (
                      <span className="text-muted-foreground">Listening... speak now; text appears in the box above as you go.</span>
                    )}
                  </p>
                </div>
              )}

              <Button
                type="button"
                onClick={toggleVoice}
                disabled={!speakSupported}
                aria-pressed={isListening}
                aria-label={
                  isListening
                    ? "Stop voice input"
                    : `${voiceLabelIdle}. Your speech is converted to text in the answer above.`
                }
                className={`group w-full h-13 mt-4 rounded-xl font-medium text-base transition-all duration-300 touch-manipulation ${
                  !speakSupported
                    ? "bg-muted text-muted-foreground cursor-not-allowed border-2 border-border"
                    : isListening
                      ? "bg-primary text-primary-foreground neu-border-primary-thick neu-shadow-primary-sm shadow-lg shadow-primary/20"
                      : "bg-secondary text-primary hover:bg-primary hover:text-primary-foreground border-2 border-primary neu-shadow-primary-xs neu-btn-press"
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5 mr-2 shrink-0" aria-hidden />
                    Tap to stop
                    <span className="ml-2 flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "0.15s" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "0.3s" }} />
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-2 shrink-0 transition-transform duration-300 group-hover:scale-110" aria-hidden />
                    {voiceLabelIdle}
                  </>
                )}
              </Button>

              {!speakSupported && (
                <p className="mt-2 text-[13px] text-muted-foreground text-center">
                  Voice typing needs a supported browser (e.g. Chrome or Edge). You can still type your answer.
                </p>
              )}

              <div className="mt-3 text-center">
                <p className="text-[13px] text-muted-foreground">
                  {questionNumber === 5
                    ? "Take your time — honest detail here changes what you see at the end."
                    : "Answer in your own words — you can continue whenever you are ready."}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-muted-foreground/60">
                <Shield className="w-3.5 h-3.5" />
                <p className="text-[12px]">
                  Private and secure. Your answers are never shared. No card required.
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN — image + quote + hint. Renders first on mobile
                so the visual narrative still opens with the image. */}
            <div className="order-first md:order-none flex flex-col gap-4">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden neu-border neu-shadow-md group animate-fade-in-up">
                <Image
                  src={backgroundImage}
                  alt="Question illustration"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 bg-primary text-primary-foreground text-[11px] font-black px-3 py-1.5 rounded-lg neu-shadow-xs">
                  Stage {questionNumber}/5
                </div>
              </div>

              <div className="bg-card px-5 py-4 rounded-xl neu-card-static relative animate-fade-in-up delay-100">
                <span className="absolute -top-3 left-4 text-3xl text-primary/40 font-serif select-none leading-none" aria-hidden>&ldquo;</span>
                <p className="text-[15px] text-muted-foreground italic leading-relaxed pl-3">
                  {quoteZone}
                </p>
                <span className="absolute -bottom-2 right-5 text-2xl text-primary/25 font-serif select-none leading-none" aria-hidden>&rdquo;</span>
              </div>

              <div className="bg-secondary/60 px-5 py-4 rounded-xl neu-border-primary flex items-start gap-3 animate-fade-in-right delay-200">
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Lightbulb className="w-3.5 h-3.5 text-primary" aria-hidden />
                </span>
                <p className="font-sans text-[15px] text-muted-foreground leading-[1.65]">
                  {hintBox}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Navigation Footer */}
      <footer className="sticky bottom-0 px-5 sm:px-8 py-4 bg-background/80 backdrop-blur-xl border-t-2 border-foreground/10 animate-fade-in-up delay-500">
        <div className="max-w-5xl mx-auto flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="h-14 px-5 rounded-xl border-2 border-foreground/20 text-muted-foreground shrink-0 flex items-center gap-2 transition-all duration-200 hover:border-primary/30 hover:text-primary neu-btn-press active:scale-[0.97]"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={isNavigating || !answer.trim()}
            aria-label={questionNumber === 5 ? "Complete the challenge" : "Continue to next question"}
            className="group flex-1 h-14 rounded-xl font-extrabold text-lg transition-all duration-300 active:scale-[0.98] bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed neu-border-primary neu-shadow-primary-sm neu-btn-press"
          >
            {isNavigating ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {questionNumber === 5 ? "Complete the challenge" : "Continue"}
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            )}
          </Button>
        </div>
      </footer>
    </div>
  )
}

// Web Speech API — minimal type declarations (the DOM lib does not ship these
// because the spec is still experimental). Constructor + event signatures
// cover everything this component uses.
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
