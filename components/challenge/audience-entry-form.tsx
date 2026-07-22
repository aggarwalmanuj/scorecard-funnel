"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useChallenge } from "@/context/challenge-context"
import { submitSignup } from "@/lib/submit-to-google-sheet"
import { prefetchPrompts } from "@/lib/client/prompt-cache"
import { OrientationVideo } from "@/components/challenge/orientation-video"
import { persistTelemetry } from "@/lib/persist-outputs"
import { trackWhenReady } from "@/lib/fbpixel"
import { ChallengeMenuButton } from "@/components/challenge/challenge-funnel-header-actions"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import { PrivacyNotice } from "@/components/privacy-notice"
import { PhoneField } from "@/components/phone-field"
import { dialFor } from "@/lib/country-codes"
import type { EntryContent } from "@/lib/entry-content"
import type { Vertical } from "@/lib/verticals"

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

/**
 * The signup form for the funnel entry page. The vertical (resolved
 * server-side from the ?vertical= param an external landing page appended)
 * and its entry-content pack arrive as props, so the SSR HTML already
 * carries the right copy - no client-side swap, per the SSR-visible rule.
 */
export function AudienceEntryForm({
  vertical,
  content,
}: {
  vertical: Vertical
  content: EntryContent
}) {
  const router = useRouter()
  const { setEmail, setFirstName, setAudience, setSerialNumber, reset } =
    useChallenge()

  const [firstNameValue, setFirstNameValue] = useState("")
  const [emailValue, setEmailValue] = useState("")
  // Phone is split (country + local number) and lifted here so the values
  // survive remounts. Combined below.
  const [phoneCode, setPhoneCode] = useState("US")
  const [phoneNum, setPhoneNum] = useState("")
  // Per-field "has the user interacted with this yet" - so validation hints
  // only appear after a field is touched (or on a submit attempt), never as
  // accusatory red text on a pristine form.
  const [touched, setTouched] = useState({
    firstName: false,
    email: false,
    phone: false,
  })
  const [isNavigating, setIsNavigating] = useState(false)
  const [leadFired, setLeadFired] = useState(false)
  const leadEventIdRef = useRef<string | null>(null)

  // Warm the question/beat copy cache immediately - the fetch overlaps
  // typing + the signup round-trip, so question-1 renders with its copy
  // already in hand instead of a skeleton.
  useEffect(() => {
    prefetchPrompts(vertical)
  }, [vertical])

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

  // Contact-only gate: phone is optional, so it blocks only when
  // present-but-invalid.
  const formInvalid = !trimmedName || !emailValid || !phoneValid
  const missing: string[] = []
  if (!trimmedName) missing.push("your first name")
  if (!emailValid) missing.push("a valid email")

  // The one conversion on this page: validate, fire the Lead once, write the
  // signup row, and go straight to question 1 on this vertical's track.
  const handleStart = async () => {
    if (isNavigating) return
    if (formInvalid) {
      // Surface the inline hints so the user can see exactly why nothing
      // happened, then bring the first unmet field into view and focus it.
      setTouched({ firstName: true, email: true, phone: true })
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

    setIsNavigating(true)

    reset()
    setFirstName(trimmedName)
    setEmail(trimmedEmail)
    setAudience(vertical)

    // Fire the Meta standard "Lead" once. The generated id rides along on
    // the signup row so the server-side Lead (Conversions API, fired from
    // the signup route) dedups against this browser pixel - one conversion,
    // surviving ad-blockers. content_name stays the established tracking id;
    // the vertical rides along as a custom property for per-vertical
    // breakdowns in Ads Manager.
    if (!leadFired) {
      const leadEventId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `lead-${Date.now()}-${Math.random().toString(36).slice(2)}`
      leadEventIdRef.current = leadEventId
      trackWhenReady(
        "Lead",
        { content_name: "belief-score-signup", vertical },
        leadEventId,
      )
      setLeadFired(true)
    }

    // Awaited: the funnel stays resilient to a missing serialNumber, but a
    // completed write means answers start attaching to the row immediately.
    const sno = await submitSignup(
      trimmedName,
      trimmedEmail,
      vertical,
      trimmedPhone || undefined,
      leadEventIdRef.current ?? undefined,
    )
    if (sno !== null) {
      setSerialNumber(sno)
      // Tie this tester to their PostHog session for /techadmin.
      persistTelemetry({ serialNumber: sno, firstName: trimmedName, email: trimmedEmail })
    }

    router.push(`/challenge/${vertical}/question-1`)
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
          {/* The entrance animation runs straight from the SSR classes —
              never hold this page at opacity-0 until hydration. */}
          <div className="mb-10 text-center animate-fade-in-up">
            <p className="eyebrow mb-6 text-foreground/70">
              <span className="pulse-dot mr-3" aria-hidden />
              {content.eyebrow}
            </p>
            <h1 className="font-serif text-[2.4rem] leading-[1.04] text-ink sm:text-[3rem] md:text-[3.5rem]">
              {content.headline}
              <span className="block font-serif-italic text-foreground">
                {content.headlineAccent}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-[1.8] text-foreground/85 sm:text-base">
              {content.subcopy}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleStart()
            }}
            className="mx-auto mb-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 animate-fade-in-up delay-100"
          >
            <label className="block">
              <span className="eyebrow mb-2 block text-foreground/70">
                First name
              </span>
              {/* data-ph-unmask: reveal ONLY this field in PostHog session
                  replays so we can identify which tester a recording belongs
                  to. Email + all other inputs stay masked - see the
                  maskInputFn in instrumentation-client.ts. */}
              {/* Autofill is deliberately ENABLED. The old
                  autoComplete="off" + name mangling forced every mobile
                  visitor to hand-type their name and email at the very
                  first gate — the exact step with the funnel's worst
                  drop-off. One keyboard-suggestion tap beats a pristine
                  empty field. */}
              <Input
                id="firstName"
                name="firstName"
                placeholder="As you would like to be addressed"
                type="text"
                autoComplete="given-name"
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
                name="email"
                placeholder="name@email.com"
                type="email"
                inputMode="email"
                autoComplete="email"
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
            {/* Privacy line at the point of email capture (readiness-gate spec).
                Kept to one sentence per the doc - the canonical Privacy/Terms
                links live in <PrivacyNotice> below the CTA. */}
            <p className="text-[12px] leading-snug text-foreground/60 sm:col-span-2">
              Your answers are private, reviewed only to prepare your result,
              and never sold. You can request deletion at any time. Full
              details in our Privacy Policy.
            </p>
          </form>

          {/* Orientation video - optional and non-blocking. Below the form:
              it never pushes the inputs or the CTA out of the first screens.
              Hidden for verticals whose entry pack turns it off. */}
          {content.showVideo && <OrientationVideo />}

          {/* Gentle, neutral hint that explains the greyed button - updates live
              so "why is the button dim?" is never a mystery. Per-field red
              messages handle format errors. */}
          {formInvalid && (
            <p
              aria-live="polite"
              className="mt-7 text-center text-[13px] leading-[1.7] text-foreground/55"
            >
              To continue, add {joinWithAnd(missing)}.
            </p>
          )}

          <div className="mt-10 flex flex-col items-center justify-between gap-5 animate-fade-in-up delay-400 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              Back to home
            </Link>

            {/* Not disabled on an incomplete form: clicking while invalid
                reveals the per-field hints (handleStart) so the user always
                learns what's missing. Only disabled mid-submit. */}
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={isNavigating}
              aria-disabled={formInvalid || isNavigating}
              className={`s-btn group min-w-44 justify-center ${
                formInvalid ? "opacity-60" : ""
              }`}
            >
              {isNavigating ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
              ) : (
                <>
                  {content.ctaLabel}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                    strokeWidth={1.6}
                  />
                </>
              )}
            </button>
          </div>

          <PrivacyNotice className="mx-auto mt-8 max-w-2xl justify-center text-center" />

        </div>
      </main>
    </div>
  )
}
