"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChallenge, type Audience, type ChallengeState } from "@/context/challenge-context"
import { submitToGoogleSheet } from "@/lib/submit-to-google-sheet"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import {
  ChallengeMenuButton,
} from "@/components/challenge/challenge-funnel-header-actions"

interface BeatRevealScreenProps {
  audience: Audience
  beatNumber: 1 | 2 | 3 | 4 | 5
  title: string
  subtitle: string
  dynamicLabel?: string
  feedbackQuestion?: string
  backgroundImage: string
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
  nextRoute,
  prevRoute,
}: BeatRevealScreenProps) {
  const router = useRouter()
  const { state } = useChallenge()
  const beatKey = `beat${beatNumber}` as keyof ChallengeState["beats"]
  const beatContent = state.beats[beatKey]

  const [isRevealed, setIsRevealed] = useState(false)
  const [visibleTokenCount, setVisibleTokenCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pendingPartly, setPendingPartly] = useState(false)
  const [partlyReason, setPartlyReason] = useState("")
  const [isTransitioning, setIsTransitioning] = useState(false)

  const tokens = useMemo(() => {
    if (!beatContent?.trim()) return [] as string[]
    return beatContent.split(/(\s+)/).filter((t) => t.length > 0)
  }, [beatContent])

  const PARTLY_ID = "Partly — close enough"
  const feedbackOptions = [
    { id: "Yes — that is exactly it", label: "Yes — that is exactly it", emoji: "✓" },
    { id: PARTLY_ID, label: "Partly — close enough", emoji: "≈" },
    { id: "Not quite, but I am curious", label: "Not quite, but I am curious", emoji: "→" },
  ]

  useEffect(() => {
    setVisibleTokenCount(0)
    setIsComplete(false)
    setFeedback(null)
    setPendingPartly(false)
    setPartlyReason("")
    setIsRevealed(false)
    const revealTimer = setTimeout(() => setIsRevealed(true), 300)
    return () => clearTimeout(revealTimer)
  }, [beatContent])

  useEffect(() => {
    if (!isRevealed || tokens.length === 0) return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setVisibleTokenCount(i)
      if (i >= tokens.length) {
        clearInterval(id)
        setIsComplete(true)
      }
    }, 38)
    return () => clearInterval(id)
  }, [isRevealed, tokens])

  const submitFeedback = (option: string, reason?: string) => {
    setFeedback(option)
    if (state.email?.trim() && state.serialNumber) {
      const combined = reason?.trim()
        ? `${option} | ${reason.trim()}`
        : option
      void submitToGoogleSheet({
        action: "feedback",
        firstName: state.firstName,
        email: state.email.trim(),
        audience,
        serialNumber: state.serialNumber,
        beatNumber,
        feedback: combined,
      })
    }
    setIsTransitioning(true)
    window.setTimeout(() => router.push(nextRoute), 1200)
  }

  const handleFeedback = (option: string) => {
    if (feedback || isTransitioning) return
    if (option === PARTLY_ID) {
      setPendingPartly(true)
      return
    }
    submitFeedback(option)
  }

  const handlePartlyContinue = () => {
    if (feedback || isTransitioning) return
    submitFeedback(PARTLY_ID, partlyReason)
  }

  const handleBack = () => {
    router.push(prevRoute)
  }

  const progressDots = [1, 2, 3, 4, 5]

  // Progress of reveal used to hide the "this usually takes..." line near completion
  const revealFraction = tokens.length > 0 ? visibleTokenCount / tokens.length : 0
  const showTimeHint = tokens.length === 0 || revealFraction < 0.75

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

        {/* Progress Dots — strictly display-only */}
        <div
          className="flex items-center gap-1 sm:gap-1.5 pointer-events-none select-none"
          aria-label={`Reflection ${beatNumber} of 5`}
        >
          {progressDots.map((dot, idx) => (
            <div key={dot} className="flex items-center gap-1 sm:gap-1.5">
              {dot < beatNumber ? (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center transition-all duration-500" aria-hidden>
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              ) : dot === beatNumber ? (
                <div className="w-7 h-7 rounded-full bg-primary ring-4 ring-primary/20 flex items-center justify-center transition-all duration-500" aria-hidden>
                  <span className="text-[11px] font-black text-primary-foreground">{dot}</span>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-border bg-background flex items-center justify-center transition-all duration-500" aria-hidden>
                  <span className="w-1.5 h-1.5 rounded-full bg-border" />
                </div>
              )}
              {idx < progressDots.length - 1 && (
                <div className={`hidden sm:block w-4 h-0.5 rounded-full transition-all duration-500 ${
                  dot < beatNumber ? "bg-primary" : "bg-border"
                }`} aria-hidden />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col items-end gap-0.5 text-right min-w-0">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <ChallengeNavHome />
          </div>
          <span className="text-[13px] text-muted-foreground">
            Reflection {beatNumber} of 5
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-14">
        {/* Beat Image */}
        <div className="px-5 sm:px-8 pt-5 animate-fade-in-up">
          <div className="max-w-2xl mx-auto">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden neu-border neu-shadow-md group">
              <Image
                src={backgroundImage}
                alt={`Reflection ${beatNumber} illustration`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 bg-primary text-primary-foreground text-[11px] font-black px-3 py-1.5 rounded-lg neu-shadow-xs">
                {beatNumber} of 5
              </div>
            </div>
          </div>
        </div>

        {/* Position hint — replaces internal label pill (bug 7) */}
        <div className="px-5 sm:px-8 mt-5 animate-fade-in-up delay-200">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
            <span className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-black uppercase tracking-[0.08em] px-5 py-2 rounded-xl neu-border-primary-thick neu-shadow-primary-sm">
              <span className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-[11px] font-black">
                {beatNumber}
              </span>
              {`Reflection ${beatNumber} of 5`}
            </span>
            <div className="h-10 w-0.5 bg-gradient-to-b from-primary to-primary/10 rounded-full animate-in fade-in duration-700" aria-hidden />
          </div>
        </div>

        {/* Beat Content Card — AI text first, then header/sub-header (task 4 flip) */}
        <div className="px-5 sm:px-8 py-6 animate-curtain-rise delay-300">
          <div className={`max-w-2xl mx-auto bg-card rounded-2xl p-6 sm:p-8 transition-all duration-700 ${
            isComplete ? "neu-card-primary" : "border-2 border-border/60"
          }`}>
            {/* Title */}
            <div
              className={`mb-2 transition-all duration-500 ${
                isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <h1 className="font-black tracking-tighter text-[24px] sm:text-[28px] text-foreground leading-[1.3]">
                {title}
              </h1>
            </div>

            {/* AI body — word-by-word reveal (now the lead) */}
            <div className="min-h-16">
              <p className="font-sans text-[17px] leading-[1.8] text-foreground whitespace-pre-wrap transition-opacity duration-300">
                {tokens.length === 0 ? (
                  <span className="text-muted-foreground flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                      Composing your reflection...
                    </span>
                    {showTimeHint && (
                      <span className="text-[13px] text-muted-foreground/70 pl-3.5 transition-opacity duration-500">
                        This usually takes 20–40 seconds.
                      </span>
                    )}
                  </span>
                ) : (
                  <>
                    {tokens.slice(0, visibleTokenCount).join("")}
                    {visibleTokenCount > 0 && visibleTokenCount < tokens.length ? (
                      <span
                        className="inline-block w-[2px] h-[1.1em] bg-primary ml-0.5 align-middle typewriter-cursor rounded-full"
                        aria-hidden
                      />
                    ) : null}
                  </>
                )}
              </p>
            </div>

            {/* Reveal state indicator — softened language */}
            <div className="mt-4">
              {tokens.length > 0 && !isComplete && (
                <span className="flex flex-col gap-0.5 text-xs text-primary/70">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" />
                    Composing your reflection...
                  </span>
                  {showTimeHint && (
                    <span className="text-[11px] text-muted-foreground/60 pl-3.5">
                      This usually takes 20–40 seconds.
                    </span>
                  )}
                </span>
              )}
              {isComplete && (
                <span className="flex items-center gap-2 text-xs text-primary animate-in fade-in duration-500">
                  <Check className="w-3.5 h-3.5" />
                  Your reflection
                </span>
              )}
            </div>

            {/* Reveal: title + subtitle land AFTER the body (task 4) */}
            {isComplete && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-3 my-6" aria-hidden>
                  <span className="flex-1 h-0.5 bg-primary/15 rounded-full" />
                  <span className="w-2 h-2 rounded-full bg-primary/30" />
                  <span className="flex-1 h-0.5 bg-primary/15 rounded-full" />
                </div>
                <h1 className="font-black tracking-tighter text-[24px] sm:text-[28px] text-foreground leading-[1.3] mb-2">
                  {title}
                </h1>
                <p className="text-muted-foreground font-sans text-[15px]">
                  {subtitle}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Section */}
        {isComplete && (
          <div className="px-5 sm:px-8 pb-6">
            <div className="max-w-2xl mx-auto transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 mb-8">
                <span className="flex-1 h-0.5 bg-primary/20 rounded-full" />
                <span className="px-3 py-1 rounded-full bg-secondary text-primary text-xs font-bold uppercase tracking-wider border-2 border-primary/30">
                  Your response
                </span>
                <span className="flex-1 h-0.5 bg-primary/20 rounded-full" />
              </div>

              <h2 className="font-black tracking-tighter text-[20px] sm:text-[22px] text-foreground leading-[1.3] mb-5">
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
                        className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-300 flex items-center justify-between group focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:ring-offset-2 ${
                          highlight
                            ? "bg-primary text-primary-foreground neu-border-primary-thick neu-shadow-primary-sm"
                            : "bg-card neu-card neu-btn-press"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all duration-300 ${
                            highlight
                              ? "bg-primary-foreground/20 text-primary-foreground scale-110"
                              : "bg-secondary text-primary group-hover:bg-primary/15"
                          }`}>
                            {option.emoji}
                          </span>
                          <span className={`font-sans text-[16px] transition-colors duration-200 ${highlight ? "font-medium" : "text-foreground group-hover:text-primary"}`}>
                            {option.label}
                          </span>
                        </span>
                        <ArrowRight className={`w-4 h-4 transition-all duration-300 ${highlight ? "translate-x-0 opacity-100" : "text-muted-foreground -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-60"}`} />
                      </button>

                      {/* Conditional input for "Partly — close enough" (task 6) */}
                      {isPartlyPending && !feedback && (
                        <div className="mt-3 ml-1 animate-in fade-in slide-in-from-top-1 duration-300">
                          <Textarea
                            value={partlyReason}
                            onChange={(e) => setPartlyReason(e.target.value)}
                            placeholder="What part didn't land?"
                            rows={2}
                            className="border-2 border-primary/30 rounded-xl bg-card focus:border-primary resize-none"
                            aria-label="What part of the reflection didn't land for you? (optional)"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[12px] text-muted-foreground">
                              Optional — leave blank if you want.
                            </span>
                            <Button
                              type="button"
                              onClick={handlePartlyContinue}
                              disabled={isTransitioning}
                              className="h-10 px-4 rounded-xl font-bold neu-border-primary neu-shadow-primary-xs neu-btn-press"
                            >
                              Continue anyway
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
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

      {/* Transition overlay between reflections (task 10) */}
      {isTransitioning && beatNumber < 5 && (
        <div
          className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-500"
          role="status"
          aria-live="polite"
        >
          <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-4">
              Continuing
            </p>
            <p className="font-black tracking-tighter text-[32px] sm:text-[40px] text-foreground leading-[1.2]">
              Reflection {beatNumber + 1}
              <span className="text-muted-foreground font-black"> / 5</span>
            </p>
            <div className="mt-6 h-0.5 w-24 mx-auto bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <footer className="sticky bottom-0 px-5 sm:px-8 py-4 bg-background/80 backdrop-blur-xl border-t-2 border-foreground/10">
        <div className="max-w-2xl mx-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="h-14 px-5 rounded-xl border-2 border-foreground/20 text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-primary neu-btn-press active:scale-[0.97]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </footer>
    </div>
  )
}
