"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, User, Users, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useChallenge, type Audience } from "@/context/challenge-context"
import { submitSignup } from "@/lib/submit-to-google-sheet"
import { persistTelemetry } from "@/lib/persist-outputs"
import { trackWhenReady } from "@/lib/fbpixel"
import { ChallengeMenuButton } from "@/components/challenge/challenge-funnel-header-actions"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import { PrivacyNotice } from "@/components/privacy-notice"
import { PhoneField } from "@/components/phone-field"
import { dialFor } from "@/lib/country-codes"

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
      "Personal Belief Score",
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
      "Team-level Belief Score",
      "Cross-functional pattern lens",
      "Built for senior leadership",
    ],
    Icon: Users,
  },
]

// Proper format check (the old `.includes("@")` accepted "a@"). Mirrors the
// offer-screen validator: something@something.tld with a 2+ char TLD.
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

// Phone is OPTIONAL, but if provided it must be plausibly dial-able so the
// sales team's WhatsApp outreach has a usable number. Loose international
// check: 7-15 digits (E.164 range), allowing +, spaces, dashes, parens.
function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim()
  if (!/^\+?[0-9\s\-().]+$/.test(trimmed)) return false
  const digits = trimmed.replace(/\D/g, "")
  return digits.length >= 7 && digits.length <= 15
}

/** "a", "a and b", "a, b and c" - for the gentle requirements hint. */
function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ""
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
}

export default function AudienceSelectionPage() {
  const router = useRouter()
  const { state, setEmail, setFirstName, setAudience, setSerialNumber, reset, isHydrated } =
    useChallenge()

  const [firstNameValue, setFirstNameValue] = useState("")
  const [emailValue, setEmailValue] = useState("")
  // Phone is split (country + local number) and lifted here so the values
  // survive the step-1/step-2 toggle remounting the field. Combined below.
  const [phoneCode, setPhoneCode] = useState("US")
  const [phoneNum, setPhoneNum] = useState("")
  const [selected, setSelected] = useState<Audience | null>(null)
  // Per-field "has the user interacted with this yet" - so validation hints
  // only appear after a field is touched (or on a submit attempt), never as
  // accusatory red text on a pristine form.
  const [touched, setTouched] = useState({
    firstName: false,
    email: false,
    phone: false,
  })
  const [isNavigating, setIsNavigating] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  // Two-step layout: 1 = contact (name/email/phone), 2 = path (individual/team).
  const [step, setStep] = useState<1 | 2>(1)

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

  const trimmedName = firstNameValue.trim()
  const trimmedEmail = emailValue.trim()
  // Combined international number, e.g. "+1 5551234567" (empty when no number).
  const trimmedPhone = phoneNum.trim()
    ? `${dialFor(phoneCode)} ${phoneNum.trim()}`
    : ""
  const emailValid = isValidEmail(trimmedEmail)
  // Optional: empty is fine; a non-empty value must look dial-able.
  const phoneValid = trimmedPhone === "" || isValidPhone(trimmedPhone)

  // Inline, per-field messages - only after the field is touched.
  const nameMessage = touched.firstName && !trimmedName ? "Please enter your first name." : ""
  const emailMessage = !touched.email
    ? ""
    : !trimmedEmail
      ? "Please enter your email."
      : !emailValid
        ? "That doesn't look like a valid email - try the format name@email.com."
        : ""
  const phoneMessage =
    touched.phone && trimmedPhone !== "" && !isValidPhone(trimmedPhone)
      ? "Add your number with country code, e.g. +1 555 123 4567."
      : ""

  const formInvalid = !trimmedName || !emailValid || !phoneValid || !selected

  // What's still missing, for the gentle hint beside the disabled button so the
  // greyed state is never a mystery.
  const missing: string[] = []
  if (!trimmedName) missing.push("your first name")
  if (!emailValid) missing.push("a valid email")
  if (!selected) missing.push("a path below")

  // Step 1 gates on contact details only (phone is optional, so it blocks only
  // when present-but-invalid). Step 2 gates on a selected path.
  const step1Invalid = !trimmedName || !emailValid || !phoneValid
  const step1Missing: string[] = []
  if (!trimmedName) step1Missing.push("your first name")
  if (!emailValid) step1Missing.push("a valid email")

  const handleContinue = async () => {
    if (isNavigating) return
    if (formInvalid) {
      // Surface the inline hints so the user can see exactly why nothing
      // happened, instead of a dead grey button.
      setTouched({ firstName: true, email: true, phone: true })
      // The user may have scrolled down to the path cards, far from the
      // inputs - so just revealing an off-screen inline error isn't enough.
      // Bring the first unmet requirement into view and focus it.
      if (typeof document !== "undefined") {
        const targetId = !trimmedName
          ? "firstName"
          : !emailValid
            ? "email"
            : !phoneValid
              ? "phone"
              : !selected
                ? "path-cards"
                : null
        const el = targetId ? document.getElementById(targetId) : null
        el?.scrollIntoView({ behavior: "smooth", block: "center" })
        if (el instanceof HTMLInputElement) el.focus({ preventScroll: true })
      }
      return
    }

    setIsNavigating(true)

    reset()
    setFirstName(trimmedName)
    setEmail(trimmedEmail)
    setAudience(selected)

    // Meta standard "Lead" — the core signup conversion and the primary event
    // lead-gen campaigns optimize toward. A shared event id lets the server-side
    // Lead (Conversions API, fired from the signup route) dedup against this
    // browser pixel — so the event counts once but survives ad-blockers.
    const leadEventId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `lead-${Date.now()}-${Math.random().toString(36).slice(2)}`
    trackWhenReady(
      "Lead",
      {
        content_name: "belief-score-signup",
        content_category: selected ?? undefined,
      },
      leadEventId,
    )

    // Fire-and-forget: the funnel is resilient to a missing serialNumber.
    const sno = await submitSignup(
      trimmedName,
      trimmedEmail,
      selected!,
      trimmedPhone || undefined,
      leadEventId,
    )
    if (sno !== null) {
      setSerialNumber(sno)
      // Tie this tester to their PostHog session for /techadmin.
      persistTelemetry({ serialNumber: sno, firstName: trimmedName, email: trimmedEmail })
    }

    router.push(`/challenge/${selected}/question-1`)
  }

  // Step 1 → Step 2. Validates contact details; reveals hints + focuses the
  // first offender if incomplete (mirrors handleContinue's behaviour).
  const handleNext = () => {
    if (step1Invalid) {
      setTouched((t) => ({ ...t, firstName: true, email: true, phone: true }))
      if (typeof document !== "undefined") {
        const targetId = !trimmedName
          ? "firstName"
          : !emailValid
            ? "email"
            : "phone"
        const el = document.getElementById(targetId)
        el?.scrollIntoView({ behavior: "smooth", block: "center" })
        if (el instanceof HTMLInputElement) el.focus({ preventScroll: true })
      }
      return
    }
    setStep(2)
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Editorial sticky nav - hairline border, no logo (per request). */}
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
            className={`mb-10 text-center ${
              isVisible ? "animate-fade-in-up" : "opacity-0"
            }`}
          >
            <p className="eyebrow mb-6 text-foreground/70">
              <span className="pulse-dot mr-3" aria-hidden />
              {step === 1 ? "I · Your details" : "II · Your path"}
            </p>
            <h1 className="font-serif text-[2.4rem] leading-[1.04] text-ink sm:text-[3rem] md:text-[3.5rem]">
              {step === 1 ? (
                <>
                  Tell us who is
                  <span className="block font-serif-italic text-foreground">
                    taking the assessment.
                  </span>
                </>
              ) : (
                <>
                  Choose the lens
                  <span className="block font-serif-italic text-foreground">
                    for your score.
                  </span>
                </>
              )}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-[1.8] text-foreground/85 sm:text-base">
              {step === 1
                ? "Your score and report are sent to the email you provide. A phone number is optional - only if you'd like a personal follow-up on WhatsApp."
                : "The diagnostic adapts to the level of the system you are trying to unlock."}
            </p>

            {/* Two-step progress indicator */}
            <div
              className="mt-7 flex items-center justify-center gap-2"
              aria-hidden
            >
              {[1, 2].map((s) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    step === s ? "w-8 bg-signal" : "w-4 bg-foreground/25"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step 1 - contact: name + email + phone */}
          {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleNext()
            }}
            className={`mx-auto mb-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 ${
              isVisible ? "animate-fade-in-up delay-100" : "opacity-0"
            }`}
            autoComplete="off"
          >
            <label className="block">
              <span className="eyebrow mb-2 block text-foreground/70">
                First name
              </span>
              {/* data-ph-unmask: reveal ONLY this field in PostHog session
                  replays so we can identify which tester a recording belongs
                  to. Email + all other inputs stay masked - see the
                  maskInputFn in instrumentation-client.ts. */}
              <Input
                id="firstName"
                name="firstName-no-autofill"
                placeholder="As you would like to be addressed"
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                data-ph-unmask="true"
                value={firstNameValue}
                onChange={(e) => setFirstNameValue(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
                aria-invalid={!!nameMessage}
                aria-describedby={nameMessage ? "firstName-error" : undefined}
                className={`s-input h-12 ${nameMessage ? "ring-1 ring-destructive/60" : ""}`}
              />
              {nameMessage && (
                <p
                  id="firstName-error"
                  role="alert"
                  className="mt-1.5 text-[12.5px] leading-snug text-destructive"
                >
                  {nameMessage}
                </p>
              )}
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
                inputMode="email"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                aria-invalid={!!emailMessage}
                aria-describedby={emailMessage ? "email-error" : undefined}
                className={`s-input h-12 ${emailMessage ? "ring-1 ring-destructive/60" : ""}`}
              />
              {emailMessage && (
                <p
                  id="email-error"
                  role="alert"
                  className="mt-1.5 text-[12.5px] leading-snug text-destructive"
                >
                  {emailMessage}
                </p>
              )}
            </label>
            <label className="block sm:col-span-2">
              <span className="eyebrow mb-2 block text-foreground/70">
                WhatsApp / phone{" "}
                <span className="text-foreground/45 normal-case">(optional)</span>
              </span>
              <PhoneField
                id="phone"
                invalid={!!phoneMessage}
                describedBy={phoneMessage ? "phone-error" : "phone-hint"}
                code={phoneCode}
                num={phoneNum}
                onCodeChange={setPhoneCode}
                onNumChange={setPhoneNum}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              />
              {phoneMessage ? (
                <p
                  id="phone-error"
                  role="alert"
                  className="mt-1.5 text-[12.5px] leading-snug text-destructive"
                >
                  {phoneMessage}
                </p>
              ) : (
                <p id="phone-hint" className="mt-1.5 text-[12px] leading-snug text-foreground/55">
                  Pick your country code; a number lets the team reach you on WhatsApp.
                </p>
              )}
            </label>
          </form>
          )}

          {/* Step 2 - path: two editorial cards */}
          {step === 2 && (
          <div id="path-cards" className="mx-auto max-w-3xl scroll-mt-24">
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
              {cards.map((card, idx) => {
                const isActive = selected === card.id
                const Icon = card.Icon
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelected(card.id)}
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
          )}

          {/* Gentle, neutral hint that explains the greyed button - updates live
              so "why is the button dim?" is never a mystery. Per-field red
              messages handle format errors. */}
          {step === 1 && step1Invalid && (
            <p
              aria-live="polite"
              className="mt-7 text-center text-[13px] leading-[1.7] text-foreground/55"
            >
              To continue, add {joinWithAnd(step1Missing)}.
            </p>
          )}
          {step === 2 && !selected && (
            <p
              aria-live="polite"
              className="mt-7 text-center text-[13px] leading-[1.7] text-foreground/55"
            >
              Pick a path to get your score.
            </p>
          )}

          <div
            className={`mt-10 flex flex-col items-center justify-between gap-5 sm:flex-row ${
              isVisible ? "animate-fade-in-up delay-400" : "opacity-0"
            }`}
          >
            {step === 1 ? (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Back to home
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Back
              </button>
            )}

            {/* Not disabled on an incomplete form: clicking while invalid
                reveals the per-field hints (handleNext / handleContinue) so the
                user always learns what's missing. Only disabled mid-submit. */}
            {step === 1 ? (
              <button
                type="button"
                onClick={handleNext}
                aria-disabled={step1Invalid}
                className={`s-btn group min-w-44 justify-center ${
                  step1Invalid ? "opacity-60" : ""
                }`}
              >
                Next
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                  strokeWidth={1.6}
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleContinue}
                disabled={isNavigating}
                aria-disabled={!selected || isNavigating}
                className={`s-btn group min-w-44 justify-center ${
                  !selected ? "opacity-60" : ""
                }`}
              >
                {isNavigating ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                ) : (
                  <>
                    Get your free score
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                      strokeWidth={1.6}
                    />
                  </>
                )}
              </button>
            )}
          </div>

          <PrivacyNotice className="mx-auto mt-8 max-w-2xl justify-center text-center" />

        </div>
      </main>
    </div>
  )
}
