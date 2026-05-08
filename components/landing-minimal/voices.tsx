"use client"

import { Reveal } from "./motion"
import { VideoTestimonialsWall } from "@/components/video-testimonials-wall"

const voices = [
  {
    quote:
      "Life-changing. I didn't know something like this existed - a precise reading instead of another assessment.",
    author: "Senior Executive",
    place: "Marbella",
  },
  {
    quote:
      "My stress went quiet within days. Better sleep. Less noise. More clarity in the morning.",
    author: "Nick H.",
    place: "Creative Director",
  },
  {
    quote:
      "I feel deeply at peace in a way I have not in years. The pattern was named, and something settled.",
    author: "Manoj P.",
    place: "Senior Leader",
  },
  {
    quote:
      "Forty percent operational cost reduction within weeks. Same team, different reading.",
    author: "Michelle J.",
    place: "Business Owner",
  },
  {
    quote:
      "Three consultants. Two restructures. The same ceiling. One reading found what was underneath.",
    author: "Senior Executive",
    place: "Fortune 500",
  },
  {
    quote:
      "Six-times income in six months. Not because the strategy changed - because something in the way finally was not.",
    author: "Founder",
    place: "Anonymous",
  },
] as const

export function VoicesSection() {
  return (
    <section id="voices" className="py-20 sm:py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-16">
        <Reveal
          as="div"
          className="grid items-end gap-10 lg:grid-cols-12 lg:gap-16"
        >
          <div className="lg:col-span-7">
            <p className="eyebrow mb-6 text-foreground/70">IV · Voices</p>
            <h2 className="font-serif text-[2rem] leading-[1.08] text-ink sm:text-5xl lg:text-6xl">
              Words from those who
              <span className="block font-serif-italic text-foreground">
                have sat with the mirror.
              </span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[16px] leading-[1.8] text-foreground/85 sm:text-lg">
              Gathered over quiet mornings and after long walks, in letters we
              have been fortunate to receive.
            </p>
          </div>
        </Reveal>

        <Reveal as="div" delay={150} className="my-12 sm:my-16">
          <div className="hairline-anim hairline" />
        </Reveal>
      </div>

      {/* Video testimonial wall - full-bleed, breaks out of the max-w-7xl
          gutter so cards extend to the viewport edges Netflix-style. The
          component handles its own internal max-w wrapping for the arrow
          controls and the swipe hint. */}
      <Reveal as="div" delay={200} className="mb-14 sm:mb-20">
        <VideoTestimonialsWall />
      </Reveal>

      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-16">
        {/* Written voices below the wall - three-column journal grid. */}
        <Reveal as="p" delay={250} className="eyebrow mb-7 text-foreground/65">
          <span className="mr-3 inline-block h-px w-6 align-middle bg-foreground/40" />
          And in letters
        </Reveal>
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-16 lg:gap-y-12">
          {voices.map((v, i) => (
            <Reveal
              as="figure"
              key={i}
              delay={(i % 3) * 100 + 100}
              className="group flex flex-col border-t border-border pt-6 transition-transform duration-700 hover:-translate-y-1 sm:pt-7"
            >
              <blockquote className="font-serif text-[18px] leading-[1.5] text-ink transition-colors duration-500 sm:text-[20px] sm:leading-[1.45] lg:text-[22px]">
                &ldquo;{v.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-baseline justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-foreground/60 transition-colors duration-500 group-hover:text-foreground/85 sm:mt-7 sm:text-[12px]">
                <span>{v.author}</span>
                <span className="font-serif-italic normal-case tracking-normal text-foreground/70">
                  {v.place}
                </span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
