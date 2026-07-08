"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getStoredHeadline,
  resolveHeadline,
  type HeadlineVariant,
} from "@/lib/client/headline"
import { ReservationForm } from "./reservation-form"
import {
  CursorHalo,
  LetterReveal,
  ParallaxImage,
  Reveal,
  WordReveal,
} from "./motion"

// Default headline — shown on first paint and whenever the A/B experiment is
// off (no active variants in the admin's Headlines tab).
const DEFAULT_HEADLINE: HeadlineVariant = {
  id: "default",
  line1: "You already know",
  line2: "there is more in you.",
}

// How long the headline skeleton may hold the hero before we give up on the
// variant fetch and show the default. Keeps a slow/failed API from ever
// leaving the fold blank.
const HEADLINE_RESOLVE_TIMEOUT_MS = 2500

export function MinimalHero() {
  // null = still resolving → skeleton. The server render and first client
  // paint both show the skeleton (no hydration mismatch), so a visitor never
  // sees one headline replaced by another. Repeat visitors skip the skeleton:
  // their sticky assignment renders synchronously on mount while we
  // revalidate in the background.
  const [headline, setHeadline] = useState<HeadlineVariant | null>(null)

  useEffect(() => {
    let cancelled = false

    const stored = getStoredHeadline()
    if (stored) setHeadline(stored)

    // First visit: cap how long the skeleton can hold the fold.
    const fallback = stored
      ? null
      : setTimeout(() => {
          if (!cancelled) {
            setHeadline((current) => current ?? DEFAULT_HEADLINE)
          }
        }, HEADLINE_RESOLVE_TIMEOUT_MS)

    void resolveHeadline().then((variant) => {
      if (cancelled) return
      // Never swap copy the visitor is already reading: only apply the
      // resolved variant if nothing is on screen yet, or it's the same
      // assignment (text may have been reworded by the admin).
      setHeadline((current) =>
        !current || (variant && variant.id === current.id)
          ? (variant ?? DEFAULT_HEADLINE)
          : current
      )
    })

    return () => {
      cancelled = true
      if (fallback) clearTimeout(fallback)
    }
  }, [])

  return (
    <section className="relative" id="hero">
      <div className="mx-auto max-w-7xl px-5 pt-8 pb-16 sm:px-10 sm:pt-14 sm:pb-24 lg:px-16 lg:pt-16">
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Left - editorial copy */}
          <div className="lg:col-span-7">
            <p className="eyebrow mb-6 text-foreground/70 sm:mb-8">
              <span className="pulse-dot mr-2.5" aria-hidden />
              <LetterReveal text="I · Your Belief Score" />
            </p>

            {/* Massive serif headline - clamps tight on small phones so a
                three-line layout doesn't exceed the fold; loosens up
                cleanly through tablet to desktop. */}
            <h1 className="wrap-break-word font-serif text-[2.15rem] leading-[1.06] text-ink sm:text-6xl sm:leading-[1.02] lg:text-7xl xl:text-[5.6rem]">
              {headline ? (
                <WordReveal
                  key={headline.id}
                  segments={[
                    { kind: "text", text: headline.line1 },
                    ...(headline.line2
                      ? ([
                          { kind: "br" },
                          { kind: "italic", text: headline.line2 },
                        ] as const)
                      : []),
                  ]}
                />
              ) : (
                // Skeleton sized in `em` so it tracks the responsive type
                // scale — two bars matching the two headline lines, holding
                // the same vertical space so nothing below shifts on resolve.
                <span aria-hidden className="block space-y-[0.18em] py-[0.06em]">
                  <Skeleton className="h-[0.82em] w-[88%] max-w-[9em] rounded-sm" />
                  <Skeleton className="h-[0.82em] w-[72%] max-w-[7.5em] rounded-sm" />
                </span>
              )}
            </h1>

            <Reveal
              as="div"
              delay={300}
              className="mt-7 max-w-xl space-y-4 text-[15.5px] leading-[1.7] text-foreground/90 sm:mt-10 sm:space-y-5 sm:text-[1.05rem] sm:leading-[1.75]"
            >
              <p>
                Something underneath is still running the show. The answer has
                been in your own voice all along - you just haven&apos;t heard it
                clearly yet.
              </p>
            </Reveal>

            <Reveal
              as="div"
              delay={500}
              className="mt-9 max-w-xl scroll-mt-24 sm:mt-12 sm:scroll-mt-28"
            >
              <ReservationForm
                eyebrow="Begin your free assessment"
                title="Five quiet questions. One personal preview."
                ctaLabel="Get Your Score - Free"
              />
            </Reveal>

            <Reveal
              as="div"
              delay={700}
              className="mt-12 flex items-center gap-4 sm:mt-16 sm:gap-6"
            >
              <span className="hairline-anim block h-px w-10 bg-foreground/40 sm:w-12" />
              <p className="text-[0.74rem] leading-snug tracking-wide text-foreground/70 sm:text-[0.78rem]">
                <span className="font-serif text-[15px] text-ink underline-draw sm:text-base">
                  Peer-reviewed.
                </span>
                <span className="mx-2 text-foreground/40">·</span>
                Published in the Mensa Research Journal.
              </p>
            </Reveal>
          </div>

          {/* Right - atmospheric image with halo + cursor-follow + parallax */}
          <Reveal as="div" delay={200} className="lg:col-span-5">
            <CursorHalo>
              <div className="signal-halo relative">
                <ParallaxImage amount={28}>
                  <div className="img-hover-zoom relative overflow-hidden rounded-sm">
                    <Image
                      src="/images/hero-portrait.jpg"
                      alt="A composed professional in a quiet, reflective moment - the stillness the assessment is meant to compose"
                      width={1500}
                      height={2000}
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      className="h-72 w-full animate-ken-burns object-cover sm:h-110 lg:h-140"
                      priority
                      fetchPriority="high"
                    />
                  </div>
                </ParallaxImage>
              </div>
            </CursorHalo>

            <div className="mt-5 flex items-start justify-between gap-4 sm:mt-6 sm:gap-6">
              <p className="eyebrow text-foreground/60">I · Arrival</p>
              <p className="max-w-56 text-right font-serif-italic text-[13px] leading-snug text-foreground/80 sm:text-sm">
                &ldquo;Your Belief Score does not give you new information. It
                gives you the language for what you already knew.&rdquo;
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="hairline" />
    </section>
  )
}
