"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowRight, User, Users, Shield, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useChallenge, type Audience } from "@/context/challenge-context"
import { submitSignup } from "@/lib/submit-to-google-sheet"
import { ChallengeMenuButton } from "@/components/challenge/challenge-funnel-header-actions"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"

const cards: Array<{
  id: Audience
  badge: string
  title: string
  description: string
  bullets: string[]
  Icon: typeof User
}> = [
  {
    id: "individual",
    badge: "For You",
    title: "Individual",
    description:
      "Unlock your personal performance. Find the hidden pattern that's been quietly limiting your results.",
    bullets: [
      "Personal Unfair Advantage Score",
      "Tuned to your private context",
      "10 minutes, fully personalized",
    ],
    Icon: User,
  },
  {
    id: "team",
    badge: "For Your Org",
    title: "Team & Organization",
    description:
      "Optimize your leadership team. Identify the structural constraint quietly limiting collective performance.",
    bullets: [
      "Team-level Unfair Advantage Score",
      "Lens for cross-functional patterns",
      "Designed for senior leadership",
    ],
    Icon: Users,
  },
]

export default function AudienceSelectionPage() {
  const router = useRouter()
  const { state, setEmail, setFirstName, setAudience, setSerialNumber, reset, isHydrated } =
    useChallenge()

  const [firstNameValue, setFirstNameValue] = useState("")
  const [emailValue, setEmailValue] = useState("")
  const [selected, setSelected] = useState<Audience | null>(null)
  const [error, setError] = useState("")
  const [isNavigating, setIsNavigating] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Audience selection survives back-navigation, but name + email do NOT.
  // Each fresh visit to this page starts with empty input fields so the
  // user is never confronted with a previously-typed value. Browser-level
  // autofill is also disabled on the inputs below.
  useEffect(() => {
    if (!isHydrated) return
    if (state.audience) setSelected(state.audience)
  }, [isHydrated, state.audience])

  const handleContinue = async () => {
    if (isNavigating) return

    // Validate in order, surfacing the first issue.
    const trimmedName = firstNameValue.trim()
    const trimmedEmail = emailValue.trim()
    if (!trimmedName) {
      setError("Please enter your first name.")
      return
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.")
      return
    }
    if (!selected) {
      setError("Pick a path: Individual or Team.")
      return
    }

    setError("")
    setIsNavigating(true)

    // Wipe any stale state from a prior run, then commit fresh values.
    reset()
    setFirstName(trimmedName)
    setEmail(trimmedEmail)
    setAudience(selected)

    // Create the user document with audience attached. Fire-and-forget the
    // serial assignment — UI proceeds even if the request fails (the funnel
    // is resilient to a missing serialNumber).
    const sno = await submitSignup(trimmedName, trimmedEmail, selected)
    if (sno !== null) setSerialNumber(sno)

    router.push(`/challenge/${selected}/question-1`)
  }

  const formInvalid =
    !firstNameValue.trim() || !emailValue.trim() || !emailValue.includes("@") || !selected

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b-2 border-foreground/10">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ChallengeMenuButton />
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Colored%20%28Transparent%29-bv50Oy3VWMzhtF45BmSeOwOLdZcNoM.png"
              alt="Your Unfair Advantage"
              width={100}
              height={28}
              className="h-6 w-auto"
            />
          </div>
          <ChallengeNavHome />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-12 sm:py-16">
        <div className="w-full max-w-4xl">
          {/* Eyebrow */}
          <div
            className={`text-center mb-10 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-primary bg-secondary neu-border-primary mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Get your score
            </span>
            <h1 className="font-black tracking-tighter text-[32px] sm:text-[44px] md:text-[52px] text-foreground leading-[1.05] max-w-2xl mx-auto">
              Tell us who&apos;s taking it.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              The diagnostic adapts to the level of the system you&apos;re trying to unlock.
              We&apos;ll send your score and report to the email you provide.
            </p>
          </div>

          {/* Form — name + email */}
          <div
            className={`max-w-xl mx-auto mb-10 ${
              isVisible ? "animate-fade-in-up delay-100" : "opacity-0"
            }`}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleContinue()
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              autoComplete="off"
            >
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-1.5"
                >
                  First name
                </label>
                <Input
                  id="firstName"
                  // Random unrecognized value — bypasses Chrome/Edge's
                  // habit of ignoring autoComplete="off" on name fields.
                  name="firstName-no-autofill"
                  placeholder="e.g. Alex"
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={firstNameValue}
                  onChange={(e) => {
                    setFirstNameValue(e.target.value)
                    if (error) setError("")
                  }}
                  className="h-12 sm:h-13 text-base bg-card border-2 border-foreground/15 focus:border-primary rounded-xl px-4 font-medium placeholder:text-muted-foreground/60"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-1.5"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email-no-autofill"
                  placeholder="you@company.com"
                  type="email"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={emailValue}
                  onChange={(e) => {
                    setEmailValue(e.target.value)
                    if (error) setError("")
                  }}
                  className="h-12 sm:h-13 text-base bg-card border-2 border-foreground/15 focus:border-primary rounded-xl px-4 font-medium placeholder:text-muted-foreground/60"
                />
              </div>
            </form>
          </div>

          {/* Audience cards */}
          <div className="mb-2 max-w-xl mx-auto sm:max-w-none">
            <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-2 sm:text-center">
              Pick your path
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            {cards.map((card, idx) => {
              const isActive = selected === card.id
              const Icon = card.Icon
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    setSelected(card.id)
                    if (error) setError("")
                  }}
                  aria-pressed={isActive ? "true" : "false"}
                  className={`group relative text-left p-7 sm:p-8 rounded-2xl bg-card transition-all duration-300 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:ring-offset-2 ${
                    isActive
                      ? "neu-card-primary -translate-y-0.5"
                      : "neu-card hover:-translate-y-0.5"
                  } ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
                  style={{ animationDelay: `${200 + idx * 80}ms` }}
                >
                  {isActive && (
                    <span className="absolute top-4 right-4 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center neu-shadow-primary-xs animate-in fade-in zoom-in duration-200">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 transition-all duration-300 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </span>

                  <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-primary/80 mb-2">
                    {card.badge}
                  </span>

                  <h2 className="font-black tracking-tight text-[22px] sm:text-[24px] text-foreground leading-tight mb-2">
                    {card.title}
                  </h2>

                  <p className="text-[15px] text-muted-foreground leading-relaxed mb-5">
                    {card.description}
                  </p>

                  <ul className="space-y-1.5">
                    {card.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-[13px] text-foreground/80"
                      >
                        <span
                          className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                            isActive ? "bg-primary" : "bg-primary/40"
                          }`}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>

          {/* Inline error */}
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mt-6 text-center text-sm font-medium text-destructive"
            >
              {error}
            </div>
          )}

          {/* Continue */}
          <div
            className={`mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 ${
              isVisible ? "animate-fade-in-up delay-400" : "opacity-0"
            }`}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to home
            </Link>

            <Button
              type="button"
              onClick={handleContinue}
              disabled={formInvalid || isNavigating}
              className="group h-13 sm:h-14 px-7 rounded-xl font-extrabold text-base sm:text-lg neu-border-primary neu-shadow-primary-sm neu-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isNavigating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white" />
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Begin diagnostic
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </div>

          <p className="mt-5 text-center text-[13px] text-muted-foreground flex items-center justify-center gap-2 font-medium">
            <Shield className="h-3.5 w-3.5 text-primary/60" />
            Private and secure. Your data is never shared.
          </p>
        </div>
      </main>
    </div>
  )
}
