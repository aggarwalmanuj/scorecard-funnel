"use client"

import Image from "next/image"
import { ReservationForm } from "./reservation-form"
import {
  CursorHalo,
  LetterReveal,
  ParallaxImage,
  Reveal,
  WordReveal,
} from "./motion"

export function MinimalHero() {
  return (
    <section className="relative" id="hero">
      <div className="mx-auto max-w-7xl px-5 pt-8 pb-16 sm:px-10 sm:pt-14 sm:pb-24 lg:px-16 lg:pt-16">
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Left - editorial copy */}
          <div className="lg:col-span-7">
            <p className="eyebrow mb-6 text-foreground/70 sm:mb-8">
              <span className="pulse-dot mr-2.5" aria-hidden />
              <LetterReveal text="I · Your Unfair Advantage Score" />
            </p>

            {/* Massive serif headline - clamps tight on small phones so a
                three-line layout doesn't exceed the fold; loosens up
                cleanly through tablet to desktop. */}
            <h1 className="wrap-break-word font-serif text-[2.15rem] leading-[1.06] text-ink sm:text-6xl sm:leading-[1.02] lg:text-7xl xl:text-[5.6rem]">
              <WordReveal
                segments={[
                  { kind: "text", text: "Something quietly" },
                  { kind: "br" },
                  { kind: "italic", text: "limiting" },
                  { kind: "br" },
                  { kind: "text", text: "you." },
                ]}
              />
            </h1>

            <Reveal
              as="div"
              delay={300}
              className="mt-7 max-w-xl space-y-4 text-[15.5px] leading-[1.7] text-foreground/90 sm:mt-10 sm:space-y-5 sm:text-[1.05rem] sm:leading-[1.75]"
            >
              <p>
                You can&apos;t always name it. But you feel it. The ceiling
                that keeps appearing. The work that won&apos;t fully click.
                The sense that you&apos;re functioning - but not fully
                present in your own life.
              </p>
              <p className="text-foreground/70">
                Your Unfair Advantage Score is a ten-minute reading across
                seven dimensions of life and work. A precise, honest
                reflection of the specific pattern running quietly underneath
                your effort.
              </p>
            </Reveal>

            <Reveal
              as="div"
              delay={500}
              className="mt-9 max-w-xl scroll-mt-24 sm:mt-12 sm:scroll-mt-28"
            >
              <ReservationForm
                eyebrow="Begin your free reading"
                title="Five quiet questions. One personal preview."
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
                      src="/images/hero-leader.jpg"
                      alt="A wide horizon at first light - the quiet a reading is meant to compose"
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
                &ldquo;The reading does not give you new information. It gives
                you the language for what you already knew.&rdquo;
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="hairline" />
    </section>
  )
}
