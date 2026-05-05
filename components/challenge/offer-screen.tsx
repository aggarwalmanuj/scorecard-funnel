"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Shield,
  Calendar,
  FileText,
  Mail,
  Download,
  FileDown,
} from "lucide-react"
import { useChallenge, type Audience } from "@/context/challenge-context"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import { ChallengeMenuButton } from "@/components/challenge/challenge-funnel-header-actions"
import { VideoTestimonialsWall } from "@/components/video-testimonials-wall"

export function OfferScreen({ audience }: { audience: Audience }) {
  const { state, markComplete } = useChallenge()
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCalendly, setShowCalendly] = useState(false)
  const [calendlyUrl, setCalendlyUrl] = useState("")

  /* Calendly scheduling URL — read from server-side env via /api route */
  useEffect(() => {
    fetch("/api/calendly/event-types")
      .then((r) => {
        if (!r.ok) {
          console.error("[calendly] fetch failed:", r.status, r.statusText)
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (!data) return
        if (data?.schedulingUrl) setCalendlyUrl(data.schedulingUrl)
        else console.warn("[calendly] No scheduling URL in response:", data)
      })
      .catch((err) => console.error("[calendly] fetch error:", err))
  }, [])

  /* Calendly widget script — single load */
  useEffect(() => {
    if (document.querySelector('script[src*="calendly.com/assets/external/widget"]')) return
    const script = document.createElement("script")
    script.src = "https://assets.calendly.com/assets/external/widget.js"
    script.async = true
    document.head.appendChild(script)
  }, [])

  const handleBookSession = useCallback(() => {
    if (!calendlyUrl) {
      alert("Calendly is not configured. Set CALENDLY_URL in your environment.")
      return
    }

    const prefill: Record<string, string> = {}
    if (state.firstName) prefill.name = state.firstName
    if (state.email) prefill.email = state.email

    if (
      typeof window !== "undefined" &&
      (window as unknown as {
        Calendly?: {
          initPopupWidget: (opts: {
            url: string
            prefill: Record<string, string>
            utm: Record<string, string>
          }) => void
        }
      }).Calendly
    ) {
      ;(
        window as unknown as {
          Calendly: {
            initPopupWidget: (opts: {
              url: string
              prefill: Record<string, string>
              utm: Record<string, string>
            }) => void
          }
        }
      ).Calendly.initPopupWidget({
        url: calendlyUrl,
        prefill,
        utm: { utmSource: "ai-merge-challenge", utmMedium: "offer-page" },
      })
      markComplete()
      return
    }

    setShowCalendly(true)
    markComplete()
  }, [calendlyUrl, state.firstName, state.email, markComplete])

  const handlePurchase = async () => {
    setIsProcessing(true)
    handleBookSession()
    await new Promise((resolve) => setTimeout(resolve, 600))
    setIsProcessing(false)
  }

  const includedItems = [
    { icon: FileText, text: "Complete review of your reading before we meet" },
    { icon: Calendar, text: "60 minutes of focused, structured decision work" },
    { icon: Check, text: "The one decision — named, framed, ready to move" },
    { icon: FileText, text: "A written summary of what surfaced and what to do next" },
    { icon: Mail, text: "One follow-up email within 7 days to check what moved" },
  ]

  return (
    <div className="min-h-screen">
      {/* Calendly widget CSS */}
      <link
        href="https://assets.calendly.com/assets/external/widget.css"
        rel="stylesheet"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-5 sm:px-8">
          <ChallengeMenuButton />
          <Link href="/" aria-label="Home" className="inline-flex items-center">
            <span className="brand-mark brand-mark-sm" aria-hidden />
          </Link>
          <ChallengeNavHome />
        </div>
      </header>

      {/* Hero — atmospheric photo + bridge copy */}
      <section className="px-5 pb-10 pt-10 sm:px-8 md:pt-14">
        <div className="mx-auto mb-6 max-w-2xl">
          <Link
            href={`/challenge/${audience}/beat-5`}
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Review your results
          </Link>
        </div>

        <div className="mx-auto max-w-2xl animate-fade-in-up">
          <figure className="mb-10">
            <div className="img-hover-zoom relative aspect-video w-full overflow-hidden rounded-md">
              <Image
                src="/manuj/1762108515290.jpg"
                alt="Manuj Aggarwal speaking"
                fill
                className="animate-ken-burns object-cover object-[65%_center]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
            </div>
            <figcaption className="mt-3 flex items-center gap-3">
              <span className="h-px w-8 bg-foreground/40" aria-hidden />
              <span className="eyebrow text-foreground/65">
                Your reading is complete
              </span>
            </figcaption>
          </figure>

          <p className="eyebrow mb-5 flex items-center gap-3 text-foreground/70">
            <span className="pulse-dot" aria-hidden />
            VIII · One option to go deeper
          </p>

          <h1 className="mb-7 font-serif text-[1.85rem] leading-[1.12] text-ink sm:text-[2rem] sm:leading-[1.1] md:text-[2.5rem]">
            {state.firstName ? `${state.firstName}, the` : "The"} noise has been
            louder
            <span className="block font-serif-italic text-foreground">
              than the signal.
            </span>
            <span className="mt-3 block">That changes now.</span>
          </h1>

          <div className="mb-10 max-w-xl space-y-5 text-[16px] leading-[1.8] text-foreground/85">
            <p>
              What you shared in this reading revealed something most leaders at
              your level never see clearly — the structural pattern underneath
              the surface problem.
            </p>
            <p className="text-foreground/75">
              The question is no longer whether to move.
              <br />
              The question is whether you want to move it alone — or with
              someone who has already read your file.
            </p>
          </div>

          {/* Downloadable detailed report */}
          <aside className="mb-3 rounded-md border border-border bg-secondary/40 p-6 sm:p-7 animate-fade-in-up">
            <div className="flex items-start gap-4">
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink">
                <FileDown className="h-4.5 w-4.5" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="eyebrow mb-2 text-foreground/70">
                  Your detailed report
                </p>
                <h3 className="mb-2 font-serif text-[20px] leading-snug text-ink sm:text-[22px]">
                  Download your Clarity Readiness Report
                </h3>
                <p className="mb-5 text-[14.5px] leading-[1.7] text-foreground/85">
                  A four-page personalised PDF — your scores across four
                  pillars, the threads we pulled from your answers, and the
                  specific moves we&apos;d suggest. Yours to keep.
                </p>
                <a
                  href="/challenge/report?autosave=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="s-btn group h-11 px-5"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={1.6} />
                  Download report
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                    strokeWidth={1.6}
                  />
                </a>
                <p className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/55">
                  <Shield className="h-3 w-3" strokeWidth={1.5} />
                  PDF saves to your downloads folder
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Voices wall — sits between the report-download hero and the
          offer pricing band. Full-bleed by design; the component manages
          its own internal max-w wrappers for header/arrows so the cards
          extend to viewport edges Netflix-style. */}
      <section
        aria-labelledby="offer-voices-heading"
        className="border-t border-border py-16 sm:py-20"
      >
        <div className="mx-auto mb-10 max-w-4xl px-6 sm:px-8 sm:mb-12">
          <p className="eyebrow mb-4 text-foreground/70">
            <span className="mr-3 inline-block h-px w-6 align-middle bg-foreground/40" />
            Voices from the reading
          </p>
          <h2
            id="offer-voices-heading"
            className="font-serif text-[26px] leading-[1.15] text-ink sm:text-[32px]"
          >
            Hear from those who
            <span className="block font-serif-italic text-foreground">
              sat with the mirror first.
            </span>
          </h2>
        </div>
        <VideoTestimonialsWall />
      </section>

      {/* The Offer — slightly lifted Marine surface (var(--card) sits one
          tone above var(--background) on the deep-navy palette). Previously
          this band inverted to var(--ink) which read as a stark cream
          insert against the rest of the funnel. The lift keeps the page
          in continuous Marine tonality and lets typography + the signal
          accent carry the emphasis instead of a colour switch. */}
      <section
        className="relative px-5 py-14 sm:px-8 md:py-20"
        style={{
          background: "var(--card)",
          color: "var(--foreground)",
          borderTop:
            "1px solid color-mix(in srgb, var(--ink) 20%, transparent)",
          borderBottom:
            "1px solid color-mix(in srgb, var(--ink) 20%, transparent)",
        }}
      >
        {/* Top accent hairline, signal-tinted, draws the eye in. */}
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--signal), transparent)",
          }}
          aria-hidden
        />
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow mb-6 inline-flex items-center gap-3 text-foreground/75">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--signal)" }}
              aria-hidden
            />
            One option to go deeper
          </p>

          <h2 className="mb-7 font-serif text-[1.85rem] leading-[1.12] text-ink sm:text-[2rem] sm:leading-[1.1] md:text-[2.5rem]">
            The Honest Decision
            <span
              className="block font-serif-italic"
              style={{ color: "var(--signal)" }}
            >
              Session.
            </span>
          </h2>

          <div className="mb-10 max-w-xl space-y-5 text-[16px] leading-[1.8] text-foreground/90">
            <p>
              A 60-minute private session designed to move what the reading
              surfaced.
            </p>
            <p className="text-foreground/75">
              Not coaching. Not consulting. A structured decision session with
              someone who has already read your responses — and can see what
              you might still be missing.
            </p>
          </div>

          <ul className="mb-10 space-y-3">
            {includedItems.map((item, idx) => {
              const Icon = item.icon
              return (
                <li
                  key={idx}
                  className="group flex items-start gap-4 border-t py-4 transition-colors duration-500 animate-fade-in-up"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--ink) 14%, transparent)",
                    animationDelay: `${idx * 80}ms`,
                  }}
                >
                  <span
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-500 group-hover:scale-110"
                    style={{
                      background:
                        "color-mix(in srgb, var(--signal) 18%, transparent)",
                      color: "var(--signal)",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
                  </span>
                  <span className="font-serif text-[16px] leading-snug text-ink/95">
                    {item.text}
                  </span>
                </li>
              )
            })}
            <li
              className="border-t"
              style={{
                borderColor: "color-mix(in srgb, var(--ink) 14%, transparent)",
              }}
              aria-hidden
            />
          </ul>

          {/* Price card */}
          <div
            className="relative mb-7 rounded-md p-7 animate-curtain-rise"
            style={{
              background:
                "color-mix(in srgb, var(--ink) 5%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--ink) 18%, transparent)",
            }}
          >
            <div
              className="absolute -top-3 right-6 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em]"
              style={{
                background: "var(--signal)",
                color: "var(--background)",
              }}
            >
              Most chosen
            </div>
            <div className="mb-3 flex items-baseline gap-2">
              <span
                className="font-serif tabular-nums leading-none text-ink"
                style={{ fontSize: "clamp(48px, 7vw, 64px)" }}
              >
                $297
              </span>
              <span className="font-serif-italic text-[15px] text-foreground/70">
                one-time
              </span>
            </div>
            <div
              className="mb-3 h-px w-12"
              style={{
                background:
                  "color-mix(in srgb, var(--signal) 60%, transparent)",
              }}
            />
            <p className="text-[14px] leading-[1.7] text-foreground/75">
              Limited availability. Sessions booked within 14 days of completing
              the reading.
            </p>
          </div>

          {/* Guarantee */}
          <div
            className="mb-10 flex items-start gap-3 rounded-md border p-5"
            style={{
              borderColor:
                "color-mix(in srgb, var(--signal) 32%, transparent)",
              background:
                "color-mix(in srgb, var(--signal) 6%, transparent)",
            }}
          >
            <Shield
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: "var(--signal)" }}
              strokeWidth={1.5}
            />
            <p className="font-serif text-[15px] leading-[1.7] text-foreground/90">
              <span className="text-ink">
                If you don&apos;t leave with a clear next move — you don&apos;t
                pay.
              </span>{" "}
              <span className="font-serif-italic text-foreground/75">
                Full stop.
              </span>
            </p>
          </div>

          {/* CTA — Marine signal teal on the lifted card. The same s-btn
              style as elsewhere in the funnel; no stand-alone styling here. */}
          <button
            type="button"
            onClick={handlePurchase}
            disabled={isProcessing}
            className="s-btn group h-14 w-full justify-center text-[12px]"
            style={{
              background: "var(--signal)",
              color: "var(--background)",
              border:
                "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
              boxShadow: "0 14px 40px -16px rgba(var(--glow), 0.55)",
            }}
          >
            {isProcessing ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
            ) : (
              <>
                Book your session
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                  strokeWidth={1.6}
                />
              </>
            )}
          </button>

          <p className="mt-4 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/60">
            <Shield className="h-3 w-3" strokeWidth={1.5} />
            Choose your time · 60-minute session
          </p>

          {/* Trust signals */}
          <ul className="mt-7 grid grid-cols-3 gap-3">
            {[
              { icon: Calendar, text: "60-min session" },
              { icon: FileText, text: "Written summary" },
              { icon: Mail, text: "7-day follow-up" },
            ].map((t) => (
              <li
                key={t.text}
                className="flex flex-col items-center gap-2 rounded-md p-4 transition-colors duration-500"
                style={{
                  background:
                    "color-mix(in srgb, var(--ink) 4%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--ink) 10%, transparent)",
                }}
              >
                <t.icon
                  className="h-4 w-4"
                  style={{ color: "var(--signal)" }}
                  strokeWidth={1.5}
                />
                <span className="text-center font-serif-italic text-[13px] text-foreground/75">
                  {t.text}
                </span>
              </li>
            ))}
          </ul>

          {/* Inline Calendly fallback */}
          {showCalendly && calendlyUrl && (
            <div
              className="mt-10 overflow-hidden rounded-md"
              style={{
                border:
                  "1px solid color-mix(in srgb, var(--ink) 14%, transparent)",
              }}
            >
              <iframe
                src={`${calendlyUrl}?hide_gdpr_banner=1${state.firstName ? `&name=${encodeURIComponent(state.firstName)}` : ""}${state.email ? `&email=${encodeURIComponent(state.email)}` : ""}`}
                width="100%"
                height="700"
                title="Schedule your Honest Decision Session"
                className="w-full"
              />
            </div>
          )}
        </div>
      </section>

      {/* Exit section */}
      <section className="bg-background px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow mb-6 text-foreground/70">
            IX · If now is not the right time
          </p>
          <h3 className="mb-7 font-serif text-[1.6rem] leading-[1.18] text-ink sm:text-[1.95rem] sm:leading-snug">
            Your reading is yours
            <span className="block font-serif-italic text-foreground">
              regardless.
            </span>
          </h3>

          <div className="mb-7 max-w-xl space-y-5 text-[16px] leading-[1.8] text-foreground/85">
            <p>What surfaced is not going anywhere.</p>
            <p className="text-foreground/75">
              The pattern you saw is now visible — and that visibility alone
              changes how you move.
            </p>
            <p className="text-foreground/75">
              If you want to come back later, the option will be here.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
          >
            Return to the beginning
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-serif-italic text-[13px] text-foreground/55">
            Composed quietly. Read at your own pace.
          </p>
        </div>
      </footer>
    </div>
  )
}
