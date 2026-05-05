"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, User, Users, Shield, Check } from "lucide-react"
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
    badge: "I · For you",
    title: "Individual",
    description:
      "Unlock your personal performance. Find the specific pattern quietly limiting your results.",
    bullets: [
      "Personal Unfair Advantage Score",
      "Tuned to your private context",
      "Ten quiet minutes",
    ],
    Icon: User,
  },
  {
    id: "team",
    badge: "II · For your org",
    title: "Team & Organization",
    description:
      "Optimize your leadership team. Identify the structural constraint quietly limiting collective performance.",
    bullets: [
      "Team-level Unfair Advantage Score",
      "Cross-functional pattern lens",
      "Built for senior leadership",
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

  // Audience selection survives back-navigation; name + email do not. Each
  // fresh visit starts blank so the user is never confronted with a stale
  // value, and browser autofill is suppressed on the inputs below.
  useEffect(() => {
    if (!isHydrated) return
    if (state.audience) setSelected(state.audience)
  }, [isHydrated, state.audience])

  // Pre-fill from query params if the landing form passed them in. The
  // landing reservation form posts `?first=…&email=…` here; reading those
  // saves the user from re-entering values they already typed.
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const f = params.get("first")
    const e = params.get("email")
    if (f) setFirstNameValue(f)
    if (e) setEmailValue(e)
  }, [])

  const handleContinue = async () => {
    if (isNavigating) return
    const trimmedName = firstNameValue.trim()
    const trimmedEmail = emailValue.trim()
    if (!trimmedName) return setError("Please enter your first name.")
    if (!trimmedEmail || !trimmedEmail.includes("@"))
      return setError("Please enter a valid email address.")
    if (!selected) return setError("Pick a path: Individual or Team.")

    setError("")
    setIsNavigating(true)

    reset()
    setFirstName(trimmedName)
    setEmail(trimmedEmail)
    setAudience(selected)

    // Fire-and-forget: the funnel is resilient to a missing serialNumber.
    const sno = await submitSignup(trimmedName, trimmedEmail, selected)
    if (sno !== null) setSerialNumber(sno)

    router.push(`/challenge/${selected}/question-1`)
  }

  const formInvalid =
    !firstNameValue.trim() || !emailValue.trim() || !emailValue.includes("@") || !selected

  return (
    <div className="flex min-h-screen flex-col">
      {/* Editorial sticky nav — hairline border, no logo (per request). */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <ChallengeMenuButton />
          <Link href="/" aria-label="Home" className="inline-flex items-center">
            <span className="brand-mark brand-mark-sm" aria-hidden />
          </Link>
          <ChallengeNavHome />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-5 py-16 sm:py-20">
        <div className="w-full max-w-4xl">
          <div
            className={`mb-12 text-center ${
              isVisible ? "animate-fade-in-up" : "opacity-0"
            }`}
          >
            <p className="eyebrow mb-6 text-foreground/70">
              <span className="pulse-dot mr-3" aria-hidden />
              I · The arrival
            </p>
            <h1 className="font-serif text-[2.4rem] leading-[1.04] text-ink sm:text-[3rem] md:text-[3.5rem]">
              Tell us who is
              <span className="block font-serif-italic text-foreground">
                taking the reading.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-[1.8] text-foreground/85 sm:text-base">
              The diagnostic adapts to the level of the system you are trying
              to unlock. Your score and report are sent to the email you
              provide.
            </p>
          </div>

          {/* Form — name + email, calm two-column, editorial inputs */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleContinue()
            }}
            className={`mx-auto mb-12 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 ${
              isVisible ? "animate-fade-in-up delay-100" : "opacity-0"
            }`}
            autoComplete="off"
          >
            <label className="block">
              <span className="eyebrow mb-2 block text-foreground/70">
                First name
              </span>
              <Input
                id="firstName"
                name="firstName-no-autofill"
                placeholder="As you would like to be addressed"
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                value={firstNameValue}
                onChange={(e) => {
                  setFirstNameValue(e.target.value)
                  if (error) setError("")
                }}
                className="s-input h-12"
              />
            </label>
            <label className="block">
              <span className="eyebrow mb-2 block text-foreground/70">
                Email
              </span>
              <Input
                id="email"
                name="email-no-autofill"
                placeholder="name@email.com"
                type="email"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                value={emailValue}
                onChange={(e) => {
                  setEmailValue(e.target.value)
                  if (error) setError("")
                }}
                className="s-input h-12"
              />
            </label>
          </form>

          {/* Pick path — eyebrow + two editorial cards */}
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow mb-5 text-center text-foreground/70">
              II · Pick your path
            </p>

            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
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
                    aria-pressed={isActive}
                    className={`group relative rounded-md p-7 text-left transition-all duration-500 sm:p-8 ${
                      isActive
                        ? "border border-ink bg-card -translate-y-0.5 shadow-[0_18px_40px_-28px_rgba(var(--shadow-ink),0.45)]"
                        : "s-card hover:-translate-y-0.5"
                    } ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
                    style={{ animationDelay: `${200 + idx * 80}ms` }}
                  >
                    {isActive && (
                      <span className="absolute right-5 top-5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink text-background">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      </span>
                    )}

                    <span
                      className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full transition-all duration-500 ${
                        isActive
                          ? "bg-ink text-background"
                          : "bg-secondary text-ink group-hover:bg-ink group-hover:text-background"
                      }`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </span>

                    <p className="eyebrow mb-3 text-foreground/70">
                      {card.badge}
                    </p>
                    <h2 className="font-serif text-[24px] leading-tight text-ink sm:text-[28px]">
                      {card.title}
                    </h2>
                    <p className="mt-3 text-[15px] leading-[1.75] text-foreground/85">
                      {card.description}
                    </p>

                    <ul className="mt-5 space-y-2.5">
                      {card.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-baseline gap-3 text-[14px] text-foreground/80"
                        >
                          <span
                            className={`h-px w-4 shrink-0 transition-colors duration-300 ${
                              isActive ? "bg-ink" : "bg-foreground/40 group-hover:bg-ink"
                            }`}
                            aria-hidden
                          />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mt-7 text-center font-serif-italic text-[15px] text-foreground/85"
            >
              {error}
            </div>
          )}

          <div
            className={`mt-12 flex flex-col items-center justify-between gap-5 sm:flex-row ${
              isVisible ? "animate-fade-in-up delay-400" : "opacity-0"
            }`}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              Back to home
            </Link>

            <button
              type="button"
              onClick={handleContinue}
              disabled={formInvalid || isNavigating}
              className="s-btn group min-w-44 justify-center"
            >
              {isNavigating ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
              ) : (
                <>
                  Begin the reading
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                    strokeWidth={1.6}
                  />
                </>
              )}
            </button>
          </div>

          <p className="mt-8 flex items-center justify-center gap-2 text-[12px] uppercase tracking-[0.22em] text-foreground/55">
            <Shield className="h-3 w-3" strokeWidth={1.5} />
            Private and secure · Never shared
          </p>
        </div>
      </main>
    </div>
  )
}
