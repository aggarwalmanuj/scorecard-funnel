"use client"

import Image from "next/image"
import { ParallaxImage, Reveal } from "./motion"

const items = [
  {
    number: "I",
    title: "Your Unfair Advantage Score",
    body: "A precise read across all seven dimensions — and the one quietly running underneath the others.",
  },
  {
    number: "II",
    title: "A personal audio composition",
    body: "Your reading, narrated quietly. What it means, what is in the way, what changes when it lifts.",
  },
  {
    number: "III",
    title: "The summary",
    body: "Top strength, primary constraint, and the shape of the pattern — in language you will recognise the moment it lands.",
  },
  {
    number: "IV",
    title: "The full diagnostic PDF",
    body: "Your complete personalised report — composed specifically around your inputs, not a templated archetype.",
  },
] as const

export function TakeHomeSection() {
  return (
    <section
      id="take-home"
      className="bg-secondary/60 py-16 sm:py-28 lg:py-36"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-16">
        <Reveal as="div" className="grid items-end gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-6 text-foreground/70">
              IV · What you carry home
            </p>
            <h2 className="font-serif text-[1.95rem] leading-[1.08] text-ink sm:text-5xl sm:leading-[1.05] lg:text-6xl">
              Four quiet things
              <span className="block font-serif-italic text-foreground">
                you will keep.
              </span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="font-serif-italic text-xl leading-normal text-ink">
              Delivered the same day. The reading does not need to be repeated
              to be remembered.
            </p>
          </div>
        </Reveal>

        <Reveal as="div" delay={150} className="my-16 sm:my-20">
          <div className="hairline-anim hairline" />
        </Reveal>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal as="figure" delay={200} className="lg:col-span-5">
            <ParallaxImage amount={20}>
              <div className="img-hover-zoom relative overflow-hidden rounded-sm">
                <Image
                  src="/images/beat-bridge.jpg"
                  alt="A view of the road taken slowly — what the reading composes"
                  width={960}
                  height={1280}
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="aspect-4/3 h-auto w-full object-cover"
                />
              </div>
            </ParallaxImage>
            <figcaption className="mt-4 flex items-center gap-4">
              <span className="h-px w-10 bg-foreground/40" />
              <span className="eyebrow text-foreground/60">
                The shape of what shifts
              </span>
            </figcaption>
          </Reveal>

          <ol className="lg:col-span-7">
            {items.map((it, i) => (
              <Reveal
                as="li"
                key={it.number}
                delay={300 + i * 80}
                className="row-interactive grid grid-cols-12 gap-6 border-t border-border py-7 last:border-b sm:gap-10 sm:py-8"
              >
                <span className="row-num col-span-2 font-serif-italic text-3xl text-foreground/40 sm:text-4xl">
                  {it.number}
                </span>
                <div className="col-span-10">
                  <h3 className="flex items-baseline gap-3 font-serif text-2xl leading-snug text-ink sm:text-[28px]">
                    <span className="row-mark" aria-hidden />
                    {it.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.8] text-foreground/80 sm:text-base">
                    {it.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
