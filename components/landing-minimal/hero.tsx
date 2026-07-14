"use client"

import Image from "next/image"
import {
  DEFAULT_HEADLINE,
  type HeadlineVariant,
} from "@/lib/headline-shared"
import { ReservationForm } from "./reservation-form"
import {
  CursorHalo,
  LetterReveal,
  ParallaxImage,
  WordReveal,
} from "./motion"

/**
 * Hero. The headline arrives as a PROP, already resolved on the server
 * (middleware assigns a variant and rewrites `/` to the matching
 * `/hl/[id]` page). There is no skeleton and no client-side resolution:
 * the first byte of HTML contains the exact copy this visitor will read,
 * and it never changes underneath them. The word-by-word compose is pure
 * CSS, so it runs on first paint without waiting for hydration.
 */
export function MinimalHero({ headline }: { headline?: HeadlineVariant }) {
  const resolved = headline ?? DEFAULT_HEADLINE

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
              <WordReveal
                segments={[
                  { kind: "text", text: resolved.line1 },
                  ...(resolved.line2
                    ? ([
                        { kind: "br" },
                        { kind: "italic", text: resolved.line2 },
                      ] as const)
                    : []),
                ]}
              />
            </h1>

            {/* rise-in (pure CSS) rather than the JS Reveal: this is the
                fold - it must compose immediately on first paint, even
                while the bundle is still downloading on a slow phone. */}
            <div
              className="rise-in mt-7 max-w-xl space-y-4 text-[15.5px] leading-[1.7] text-foreground/90 sm:mt-10 sm:space-y-5 sm:text-[1.05rem] sm:leading-[1.75]"
              style={{ ["--rise-delay" as string]: "300ms" }}
            >
              <p>
                Something underneath is still running the show. The answer has
                been in your own voice all along - you just haven&apos;t heard it
                clearly yet.
              </p>
            </div>

            <div
              className="rise-in mt-9 max-w-xl scroll-mt-24 sm:mt-12 sm:scroll-mt-28"
              style={{ ["--rise-delay" as string]: "500ms" }}
            >
              <ReservationForm
                eyebrow="Begin your free assessment"
                title="Five quiet questions. One personal preview."
                ctaLabel="Get Your Score - Free"
              />
            </div>

            <div
              className="rise-in mt-12 flex items-center gap-4 sm:mt-16 sm:gap-6"
              style={{ ["--rise-delay" as string]: "700ms" }}
            >
              <span className="hairline-anim block h-px w-10 bg-foreground/40 sm:w-12" />
              <p className="text-[0.74rem] leading-snug tracking-wide text-foreground/70 sm:text-[0.78rem]">
                <span className="font-serif text-[15px] text-ink underline-draw sm:text-base">
                  Peer-reviewed.
                </span>
                <span className="mx-2 text-foreground/40">·</span>
                Published in the Mensa Research Journal.
              </p>
            </div>
          </div>

          {/* Right - atmospheric image with halo + cursor-follow + parallax */}
          <div
            className="rise-in lg:col-span-5"
            style={{ ["--rise-delay" as string]: "200ms" }}
          >
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
          </div>
        </div>
      </div>

      <div className="hairline" />
    </section>
  )
}
