"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Calendar, Check, Shield } from "lucide-react"
import { useChallenge } from "@/context/challenge-context"

export default function ThankYouPage() {
  const { state, markComplete } = useChallenge()
  const [calendlyUrl, setCalendlyUrl] = useState("")
  const [popped, setPopped] = useState(false)

  useEffect(() => {
    markComplete()
  }, [markComplete])

  useEffect(() => {
    fetch("/api/calendly/event-types")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.schedulingUrl) setCalendlyUrl(data.schedulingUrl)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (document.querySelector('script[src*="calendly.com/assets/external/widget"]'))
      return
    const script = document.createElement("script")
    script.src = "https://assets.calendly.com/assets/external/widget.js"
    script.async = true
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!calendlyUrl || popped) return
    const win = window as unknown as {
      Calendly?: {
        initPopupWidget: (opts: {
          url: string
          prefill: Record<string, string>
          utm: Record<string, string>
        }) => void
      }
    }
    if (!win.Calendly) return
    const prefill: Record<string, string> = {}
    if (state.firstName) prefill.name = state.firstName
    if (state.email) prefill.email = state.email
    win.Calendly.initPopupWidget({
      url: calendlyUrl,
      prefill,
      utm: { utmSource: "ai-merge-challenge", utmMedium: "thank-you" },
    })
    setPopped(true)
  }, [calendlyUrl, popped, state.firstName, state.email])

  return (
    <div className="min-h-screen bg-background">
      <link
        href="https://assets.calendly.com/assets/external/widget.css"
        rel="stylesheet"
      />

      <section className="px-5 pb-16 pt-16 sm:px-8">
        <div className="mx-auto max-w-2xl animate-fade-in-up">
          <figure className="mb-10">
            <div className="relative aspect-video w-full overflow-hidden rounded-md">
              <Image
                src="/manuj/1762108515290.jpg"
                alt="Manuj Aggarwal"
                fill
                className="object-cover object-[65%_center]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
            </div>
            <figcaption className="mt-3 flex items-center gap-3">
              <span className="h-px w-8 bg-foreground/40" aria-hidden />
              <span className="eyebrow text-foreground/65">
                Payment received
              </span>
            </figcaption>
          </figure>

          <p className="eyebrow mb-5 flex items-center gap-3 text-foreground/70">
            <span className="pulse-dot" aria-hidden />
            Step 1 of 2 · Pick your time
          </p>

          <h1 className="mb-7 font-serif text-[1.85rem] leading-[1.12] text-ink sm:text-[2rem] sm:leading-[1.1] md:text-[2.5rem]">
            {state.firstName ? `${state.firstName}, you're` : "You're"} in.
            <span className="block font-serif-italic text-foreground">
              Now pick the hour.
            </span>
          </h1>

          <div className="mb-10 max-w-xl space-y-5 text-[16px] leading-[1.8] text-foreground/85">
            <p>
              Your subscription is active. The booking widget should have opened
              automatically — if it didn&apos;t, use the button below.
            </p>
            <p className="text-foreground/75">
              A receipt is on its way to {state.email || "your inbox"}.
            </p>
          </div>

          <ul className="mb-10 space-y-3">
            {[
              { icon: Check, text: "$99/mo subscription confirmed" },
              { icon: Calendar, text: "60-minute private session" },
              { icon: Shield, text: "Cancel any time inside your account" },
            ].map((item, idx) => {
              const Icon = item.icon
              return (
                <li
                  key={idx}
                  className="flex items-start gap-4 border-t border-border/60 py-4"
                >
                  <span
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
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
          </ul>

          <button
            type="button"
            onClick={() => {
              if (!calendlyUrl) return
              const win = window as unknown as {
                Calendly?: {
                  initPopupWidget: (opts: {
                    url: string
                    prefill: Record<string, string>
                    utm: Record<string, string>
                  }) => void
                }
              }
              const prefill: Record<string, string> = {}
              if (state.firstName) prefill.name = state.firstName
              if (state.email) prefill.email = state.email
              win.Calendly?.initPopupWidget({
                url: calendlyUrl,
                prefill,
                utm: { utmSource: "ai-merge-challenge", utmMedium: "thank-you" },
              })
            }}
            disabled={!calendlyUrl}
            className="s-btn group h-14 w-full justify-center text-[12px]"
            style={{
              background: "var(--signal)",
              color: "var(--background)",
              border:
                "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
              boxShadow: "0 14px 40px -16px rgba(var(--glow), 0.55)",
            }}
          >
            Open the booking widget
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
              strokeWidth={1.6}
            />
          </button>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
          >
            Return home
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
          </Link>
        </div>
      </section>
    </div>
  )
}
