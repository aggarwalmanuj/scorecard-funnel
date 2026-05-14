"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Download, Loader2, Shield } from "lucide-react"
import { useChallenge } from "@/context/challenge-context"
import {
  getCachedSummaryAudio,
  preloadSummaryAudio,
} from "@/lib/client/summary-audio-cache"

// Thank-you page — confirms successful transactions from both
// Stripe ($47 Diagnostic) and Calendly ($497 Session / $997
// Transformation). The view adapts to the source via the URL:
//
//   ?paid=1                  → Stripe success ($47)
//   ?booked=1&tier=session   → Calendly success ($497)
//   ?booked=1&tier=transformation → Calendly success ($997)
//
// All three include the diagnostic report + audio summary, so
// the downloads section is shared across all tiers.

type SuccessTier = "diagnostic" | "session" | "transformation"

interface TierCopy {
  eyebrow: string
  headlinePrefix: string
  headlineItalic: string
  body: (email: string) => string
}

const TIER_COPY: Record<SuccessTier, TierCopy> = {
  diagnostic: {
    eyebrow: "Payment received · $47 · one-time",
    headlinePrefix: "your downloads are",
    headlineItalic: "ready.",
    body: (email) =>
      `A receipt is on its way to ${email}. Both files below are yours to keep.`,
  },
  session: {
    eyebrow: "Session booked · $497",
    headlinePrefix: "your session is",
    headlineItalic: "locked in.",
    body: (email) =>
      `We've sent the calendar invite to ${email}. Your diagnostic report is included — download it below before we meet.`,
  },
  transformation: {
    eyebrow: "Transformation booked · $997",
    headlinePrefix: "the work",
    headlineItalic: "begins.",
    body: (email) =>
      `We've sent the calendar invite to ${email}. Your diagnostic report and audio summary are below; your personalized audio protocol arrives after the session.`,
  },
}

function resolveTier(): SuccessTier {
  if (typeof window === "undefined") return "diagnostic"
  const params = new URLSearchParams(window.location.search)
  const t = params.get("tier")
  if (t === "session" || t === "transformation") return t
  return "diagnostic"
}

export default function ThankYouPage() {
  const { state, markComplete } = useChallenge()
  const [isDownloadingAudio, setIsDownloadingAudio] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [tier, setTier] = useState<SuccessTier>("diagnostic")

  // Resolved on mount so SSR hydration doesn't mismatch.
  useEffect(() => {
    setTier(resolveTier())
  }, [])

  const copy = TIER_COPY[tier]

  useEffect(() => {
    markComplete()
  }, [markComplete])

  const safeName = useMemo(() => {
    const base = (state.firstName || "your")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30)
    return base || "your"
  }, [state.firstName])

  const handleAudioDownload = async () => {
    if (isDownloadingAudio) return
    const text = state.summaryText?.trim()
    if (!text) {
      setAudioError(
        "Your audio summary isn't ready yet — refresh in a moment and try again.",
      )
      return
    }
    setIsDownloadingAudio(true)
    setAudioError(null)
    try {
      const pending =
        getCachedSummaryAudio(text) ?? preloadSummaryAudio(text)
      const buffer = await pending
      if (!buffer) throw new Error("empty buffer")
      const blob = new Blob([buffer.slice(0)], { type: "audio/mpeg" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${safeName}-clarity-audio-summary.mp3`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error("[thank-you] audio download failed", err)
      setAudioError("Couldn't prepare audio. Please try again in a moment.")
    } finally {
      setIsDownloadingAudio(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
        <div className="mx-auto max-w-2xl">
          <SuccessMark />

          <p
            className="stagger-enter eyebrow mb-5 flex items-center gap-3 text-foreground/70"
            style={{ animationDelay: "200ms" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--signal)" }}
              aria-hidden
            />
            {copy.eyebrow}
          </p>

          <h1
            className="stagger-enter mb-6 font-serif text-[1.9rem] leading-[1.1] text-ink sm:text-[2.3rem] sm:leading-[1.06] md:text-[2.7rem]"
            style={{ animationDelay: "300ms" }}
          >
            {state.firstName ? `${state.firstName}, ${copy.headlinePrefix}` : `Your ${copy.headlinePrefix}`}
            <span className="block font-serif-italic text-foreground">
              {copy.headlineItalic}
            </span>
          </h1>

          <p
            className="stagger-enter mb-12 max-w-xl text-[16px] leading-[1.8] text-foreground/85"
            style={{ animationDelay: "400ms" }}
          >
            {copy.body(state.email || "your inbox")}
          </p>

          {/* Downloads */}
          <div
            className="stagger-enter space-y-4"
            style={{ animationDelay: "500ms" }}
          >
            <DownloadCard
              preview={<PdfPreview />}
              eyebrow="Diagnostic report · PDF"
              title="Your full reading"
              titleItalic="across all seven pillars."
              description="Four-page PDF — your scores, the specific pattern identified in plain language, three immediate behavioral shifts, and a 90-day benchmark to measure progress."
              actionHref="/challenge/report?paid=1&autosave=1"
              actionLabel="Download report"
              primary
            />

            <DownloadCard
              preview={<AudioPreview />}
              eyebrow="Audio summary · MP3"
              title="Your reading, in voice —"
              titleItalic="for listening, not reading."
              description="The personalized audio summary generated from your responses. Use it on walks, in transit, or anywhere the written page doesn't reach."
              actionLabel={
                isDownloadingAudio ? "Preparing…" : "Download audio"
              }
              actionLoading={isDownloadingAudio}
              onAction={handleAudioDownload}
              error={audioError}
            />
          </div>

          <p
            className="stagger-enter mt-8 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em]"
            style={{
              animationDelay: "620ms",
              color: "color-mix(in srgb, var(--foreground) 55%, transparent)",
            }}
          >
            <Shield className="h-3 w-3" strokeWidth={1.5} />
            Yours to keep · download any time
          </p>

          <div
            className="stagger-enter mt-12 border-t pt-8"
            style={{
              animationDelay: "780ms",
              borderColor: "color-mix(in srgb, var(--ink) 14%, transparent)",
            }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
            >
              Return home
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

// ──────────────────────────────────────────────────────────────
// Download card

function DownloadCard({
  preview,
  eyebrow,
  title,
  titleItalic,
  description,
  actionHref,
  actionLabel,
  actionLoading,
  onAction,
  error,
  primary,
}: {
  preview: React.ReactNode
  eyebrow: string
  title: string
  titleItalic: string
  description: string
  actionHref?: string
  actionLabel: string
  actionLoading?: boolean
  onAction?: () => void
  error?: string | null
  primary?: boolean
}) {
  const buttonStyles: React.CSSProperties = primary
    ? {
        background: "var(--signal)",
        color: "var(--background)",
        border:
          "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
        boxShadow: "0 14px 40px -16px rgba(var(--glow), 0.55)",
      }
    : {
        background: "transparent",
        color: "var(--ink)",
        border: "1px solid color-mix(in srgb, var(--ink) 28%, transparent)",
      }

  const button = (
    <button
      type="button"
      onClick={onAction}
      disabled={actionLoading}
      className="s-btn group/btn h-11 px-5 text-[12px] disabled:cursor-wait disabled:opacity-90"
      style={buttonStyles}
    >
      {actionLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.6} />
      ) : (
        <Download className="h-3.5 w-3.5" strokeWidth={1.6} />
      )}
      {actionLabel}
    </button>
  )

  return (
    <article
      className="relative rounded-md p-6 sm:p-7"
      style={{
        background: "color-mix(in srgb, var(--ink) 5%, transparent)",
        border: "1px solid color-mix(in srgb, var(--ink) 16%, transparent)",
      }}
    >
      <div className="flex items-start gap-5 sm:gap-6">
        {preview}

        <div className="min-w-0 flex-1">
          <p
            className="eyebrow mb-2"
            style={{
              color: "color-mix(in srgb, var(--foreground) 68%, transparent)",
            }}
          >
            {eyebrow}
          </p>
          <h3 className="mb-2 font-serif text-[18px] leading-[1.25] text-ink sm:text-[20px]">
            {title}
            <span className="block font-serif-italic text-foreground">
              {titleItalic}
            </span>
          </h3>
          <p className="mb-5 text-[14.5px] leading-[1.65] text-foreground/80">
            {description}
          </p>

          {actionHref ? (
            <Link
              href={actionHref}
              target="_blank"
              rel="noopener noreferrer"
              className="s-btn group/btn inline-flex h-11 items-center gap-2 px-5 text-[12px]"
              style={buttonStyles}
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.6} />
              {actionLabel}
            </Link>
          ) : (
            button
          )}

          {error && (
            <p
              className="mt-3 text-[13px] leading-snug"
              style={{
                color: "var(--ink)",
                background:
                  "color-mix(in srgb, var(--signal) 8%, transparent)",
                border:
                  "1px solid color-mix(in srgb, var(--signal) 30%, transparent)",
                padding: "8px 12px",
                borderRadius: 6,
              }}
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

// ──────────────────────────────────────────────────────────────
// File previews — bespoke per-format visuals that read as
// "this is the artifact you bought" before the user even hits
// download. Decorative, palette-driven, marked aria-hidden.

function PdfPreview() {
  return (
    <div
      className="relative shrink-0"
      aria-hidden
      style={{ width: 84, height: 108 }}
    >
      {/* Stacked-page effect — two paper shadows sit behind the
          front sheet so the preview reads as a multi-page PDF
          rather than a single card. */}
      <div
        className="absolute rounded-sm"
        style={{
          inset: "10px -4px -4px 4px",
          background: "color-mix(in srgb, var(--card) 70%, transparent)",
          border: "1px solid color-mix(in srgb, var(--ink) 14%, transparent)",
        }}
      />
      <div
        className="absolute rounded-sm"
        style={{
          inset: "5px -2px -2px 2px",
          background: "color-mix(in srgb, var(--card) 88%, transparent)",
          border: "1px solid color-mix(in srgb, var(--ink) 18%, transparent)",
        }}
      />

      {/* Front sheet — content mock so the viewer reads
          "diagnostic report" without literally rendering one. */}
      <div
        className="absolute inset-0 overflow-hidden rounded-sm"
        style={{
          background: "color-mix(in srgb, var(--card) 100%, transparent)",
          border: "1px solid color-mix(in srgb, var(--ink) 24%, transparent)",
          boxShadow: "0 10px 22px -12px rgba(var(--shadow-ink), 0.45)",
        }}
      >
        <svg viewBox="0 0 84 108" width="84" height="108">
          {/* Signal-tinted title bar */}
          <rect
            x="9"
            y="13"
            width="36"
            height="2"
            rx="1"
            fill="var(--signal)"
            opacity="0.9"
          />

          {/* Score panel — the most recognizable element of the
              real report, miniaturized so it reads at a glance. */}
          <rect
            x="9"
            y="22"
            width="66"
            height="18"
            rx="1.5"
            fill="none"
            stroke="color-mix(in srgb, var(--signal) 40%, transparent)"
            strokeWidth="0.8"
          />
          <text
            x="13"
            y="33"
            style={{
              fontSize: "5.5px",
              letterSpacing: "0.8px",
              fill: "color-mix(in srgb, var(--signal) 75%, transparent)",
              fontFamily: "var(--font-fraunces), serif",
            }}
          >
            SCORE
          </text>
          <text
            x="72"
            y="35"
            textAnchor="end"
            style={{
              fontSize: "9px",
              fill: "var(--signal)",
              fontFamily: "var(--font-fraunces), serif",
              fontWeight: 500,
            }}
          >
            78
          </text>

          {/* Headline + body line mock */}
          {[
            { y: 48, w: 60 },
            { y: 53, w: 52 },
          ].map((row, i) => (
            <rect
              key={`h${i}`}
              x="9"
              y={row.y}
              width={row.w}
              height="1.8"
              rx="0.6"
              fill="color-mix(in srgb, var(--foreground) 38%, transparent)"
            />
          ))}

          {/* Section divider */}
          <rect
            x="9"
            y="63"
            width="66"
            height="0.5"
            fill="color-mix(in srgb, var(--foreground) 20%, transparent)"
          />

          {/* Pillar bars — four mini progress rows that gesture
              at the seven-pillar score breakdown in the real PDF. */}
          {[
            { y: 70, w: 48 },
            { y: 78, w: 38 },
            { y: 86, w: 54 },
            { y: 94, w: 30 },
          ].map((row, i) => (
            <g key={`p${i}`}>
              <rect
                x="9"
                y={row.y}
                width="66"
                height="1.2"
                rx="0.6"
                fill="color-mix(in srgb, var(--foreground) 12%, transparent)"
              />
              <rect
                x="9"
                y={row.y}
                width={row.w}
                height="1.2"
                rx="0.6"
                fill="color-mix(in srgb, var(--signal) 55%, transparent)"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Format badge — overlaps the front sheet's bottom-right */}
      <span
        className="absolute -bottom-1.5 -right-1.5 inline-flex h-5 items-center rounded-full px-2 text-[8.5px] font-semibold tracking-[0.18em]"
        style={{
          background: "var(--signal)",
          color: "var(--background)",
          letterSpacing: "0.18em",
          boxShadow: "0 4px 10px -4px rgba(var(--shadow-ink), 0.5)",
        }}
      >
        PDF
      </span>
    </div>
  )
}

function AudioPreview() {
  // Pre-baked waveform heights — symmetric-ish but irregular so
  // it doesn't read as a chart pattern. The center bars are
  // tallest, suggesting the loudest point of the audio.
  const bars = [
    14, 22, 16, 30, 24, 38, 28, 46, 34, 52, 40, 56, 44, 52, 36, 48, 28, 40, 22,
    32, 18, 26, 14,
  ]
  const center = (bars.length - 1) / 2

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-sm"
      aria-hidden
      style={{
        width: 84,
        height: 108,
        background:
          "linear-gradient(160deg, color-mix(in srgb, var(--signal) 18%, var(--card)) 0%, color-mix(in srgb, var(--signal) 6%, var(--card)) 100%)",
        border: "1px solid color-mix(in srgb, var(--signal) 32%, transparent)",
        boxShadow: "0 10px 22px -12px rgba(var(--shadow-ink), 0.45)",
      }}
    >
      {/* Soft halo behind the waveform */}
      <div
        className="absolute"
        style={{
          inset: "-30% -10% auto -10%",
          height: "85%",
          background:
            "radial-gradient(ellipse at 50% 60%, color-mix(in srgb, var(--signal) 28%, transparent) 0%, transparent 65%)",
        }}
      />

      {/* Concentric "needle-drop" ring — small play-disc cue */}
      <div
        className="absolute"
        style={{
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 22,
          height: 22,
          borderRadius: "50%",
          border:
            "1px solid color-mix(in srgb, var(--signal) 55%, transparent)",
        }}
      >
        <div
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            width: 6,
            height: 6,
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--signal)",
          }}
        />
      </div>

      {/* Waveform — vertical bars, signal-tinted, center bars
          slightly more opaque to mimic a "playhead". */}
      <div
        className="absolute inset-x-0 flex items-center justify-center gap-[2px] px-2.5"
        style={{ bottom: 12, top: 42 }}
      >
        {bars.map((h, i) => {
          const dist = Math.abs(i - center)
          const opacity = 0.45 + (1 - dist / center) * 0.45
          return (
            <span
              key={i}
              className="block rounded-full"
              style={{
                width: 2,
                height: `${h}%`,
                background: "var(--signal)",
                opacity,
              }}
            />
          )
        })}
      </div>

      {/* Format badge */}
      <span
        className="absolute -bottom-1.5 -right-1.5 inline-flex h-5 items-center rounded-full px-2 text-[8.5px] font-semibold"
        style={{
          background: "var(--signal)",
          color: "var(--background)",
          letterSpacing: "0.18em",
          boxShadow: "0 4px 10px -4px rgba(var(--shadow-ink), 0.5)",
        }}
      >
        MP3
      </span>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Success mark — Apple-style draw-in. Circle traces, then the
// check traces inside it, then an outer ring begins a slow
// ambient pulse. All animations defined in globals.css so they
// honor prefers-reduced-motion centrally.

function SuccessMark() {
  return (
    <div className="mb-10 flex justify-center sm:mb-12">
      <svg
        viewBox="0 0 80 80"
        className="success-mark h-20 w-20 sm:h-24 sm:w-24"
        role="img"
        aria-label="Payment successful"
      >
        <circle
          className="ring"
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="var(--signal)"
          strokeWidth="0.5"
          opacity="0.32"
        />
        <circle
          className="circle"
          cx="40"
          cy="40"
          r="32"
          fill="none"
          stroke="var(--signal)"
          strokeWidth="1.5"
        />
        <path
          className="check"
          d="M26 42 L36 52 L54 30"
          fill="none"
          stroke="var(--signal)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
