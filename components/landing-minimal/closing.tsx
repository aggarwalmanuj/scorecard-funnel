"use client"

import Image from "next/image"
import { Reveal, WordReveal } from "./motion"
import { ReservationForm } from "./reservation-form"

export function ClosingSection() {
  return (
    <section
      className="relative overflow-hidden"
      aria-labelledby="closing-heading"
    >
      {/* Atmospheric image — kept from existing assets, palette-aware overlay. */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/landscape-golden.jpg"
          alt=""
          fill
          sizes="100vw"
          className="animate-ken-burns object-cover opacity-90"
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--background) 70%, transparent) 0%, color-mix(in srgb, var(--background) 92%, transparent) 55%, var(--background) 100%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-28 sm:px-10 sm:py-36 lg:px-16">
        <div className="grid items-end gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Reveal as="p" className="eyebrow mb-6 text-foreground/70">
              <span className="pulse-dot mr-3" aria-hidden />
              A closing
            </Reveal>
            <h2
              id="closing-heading"
              className="font-serif text-[2.6rem] leading-[1.04] text-ink sm:text-6xl lg:text-7xl"
            >
              <WordReveal
                segments={[
                  { kind: "text", text: "The clarity" },
                  { kind: "br" },
                  { kind: "italic", text: "you came searching for" },
                  { kind: "br" },
                  { kind: "text", text: "is already inside you." },
                ]}
              />
            </h2>
            <Reveal as="p" delay={500} className="mt-8 max-w-xl text-[1.05rem] leading-[1.8] text-foreground/85">
              Sit, for ten minutes, with five honest questions. Let the reading
              compose what you have already been carrying for years —
              somewhere quiet to land.
            </Reveal>
          </div>

          <Reveal as="div" delay={300} className="lg:col-span-5">
            <ReservationForm
              id="closing-form"
              eyebrow="Reserve your reading"
              title="Five quiet questions. One personal preview."
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
