"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Lock, Shield } from "lucide-react"
import { useChallenge } from "@/context/challenge-context"

export function ReportPaywall() {
  const { state } = useChallenge()
  const audience = state.audience
  const offerHref = audience
    ? `/challenge/${audience}/offer`
    : "/challenge/audience"

  return (
    <main className="min-h-screen">
      <section className="px-5 pb-20 pt-16 sm:px-8 sm:pt-20">
        <div className="mx-auto max-w-2xl animate-fade-in-up">
          <figure className="mb-10">
            <div className="img-hover-zoom relative aspect-[16/10] w-full overflow-hidden rounded-md">
              <Image
                src="/manuj/1762108515290.jpg"
                alt=""
                fill
                className="object-cover object-[65%_center] opacity-90"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/45 to-transparent" />
              <div
                className="absolute inset-0 flex items-center justify-center"
                aria-hidden
              >
                <span
                  className="inline-flex h-14 w-14 items-center justify-center rounded-full backdrop-blur-md"
                  style={{
                    background: "color-mix(in srgb, var(--ink) 35%, transparent)",
                    border:
                      "1px solid color-mix(in srgb, var(--background) 55%, transparent)",
                    color: "var(--background)",
                  }}
                >
                  <Lock className="h-5 w-5" strokeWidth={1.6} />
                </span>
              </div>
            </div>
            <figcaption className="mt-3 flex items-center gap-3">
              <span className="h-px w-8 bg-foreground/40" aria-hidden />
              <span className="eyebrow text-foreground/65">
                Your full report · Locked
              </span>
            </figcaption>
          </figure>

          <p className="eyebrow mb-5 flex items-center gap-3 text-foreground/70">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--signal)" }}
              aria-hidden
            />
            One step before the full report
          </p>

          <h1 className="mb-7 font-serif text-[1.85rem] leading-[1.12] text-ink sm:text-[2rem] sm:leading-[1.1] md:text-[2.5rem]">
            {state.firstName ? `${state.firstName}, your` : "Your"} full report is
            <span className="block font-serif-italic text-foreground">
              one step away.
            </span>
          </h1>

          <div className="mb-10 max-w-xl space-y-5 text-[16px] leading-[1.8] text-foreground/85">
            <p>
              Your full personalised report - your scored dimensions, the
              specific pattern named in plain language, and concrete next moves
              built from your exact answers - unlocks with Read The Pattern, at
              $47.
            </p>
            <p className="text-foreground/75">
              Choose your option to unlock the full report.
            </p>
          </div>

          <Link
            href={offerHref}
            className="s-btn group h-14 w-full justify-center text-[12px] sm:w-auto sm:px-8"
            style={{
              background: "var(--signal)",
              color: "var(--background)",
              border:
                "1px solid color-mix(in srgb, var(--signal) 60%, transparent)",
              boxShadow: "0 14px 40px -16px rgba(var(--glow), 0.55)",
            }}
          >
            See your options
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
              strokeWidth={1.6}
            />
          </Link>

          <p className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/55">
            <Shield className="h-3 w-3" strokeWidth={1.5} />
            Four steps · From $47 · One-time payment
          </p>

          <div className="mt-12 border-t border-border pt-8">
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
