"use client"

import Image from "next/image"
import { ParallaxImage, Reveal } from "./motion"

const items: ReadonlyArray<{
  number: string
  title: string
  body: string
  /** Paid add-on (unlocks after the assessment) - flagged with an asterisk. */
  paid?: boolean
}> = [
  {
    number: "I",
    title: "Your Belief Score",
    body: "A precise read across all seven dimensions - and the one quietly running underneath the others.",
  },
  {
    number: "II",
    title: "A personal audio composition",
    body: "Your Belief Score, narrated quietly. What it means, what is in the way, what changes when it lifts.",
  },
  {
    number: "III",
    title: "The summary",
    body: "Top strength, primary constraint, and the shape of the pattern - in language you will recognise the moment it lands.",
  },
  {
    number: "IV",
    title: "The full diagnostic PDF",
    body: "Your complete personalised report - composed specifically around your inputs, not a templated archetype.",
    paid: true,
  },
]

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
              V · What you carry home
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
              Delivered the same day. Your Belief Score does not need to be
              repeated to be remembered.
            </p>
          </div>
        </Reveal>

        <Reveal as="div" delay={150} className="my-16 sm:my-20">
          <div className="hairline-anim hairline" />
        </Reveal>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Deliverables visual - composed of three real artifacts the
              reader actually receives: the full diagnostic PDF (back card),
              the summary block (front card, smaller), and the personal
              audio composition (badge tag). Slight cross-rotation gives the
              "objects placed on a table" feeling without going theatrical;
              parallax on scroll keeps the composition alive. */}
          <Reveal as="figure" delay={200} className="lg:col-span-5">
            <ParallaxImage amount={14}>
              <div className="take-deck relative mx-auto w-full max-w-md">
                {/* Soft signal halo behind the composition - ties the cards
                    together as one "deliverables" object rather than three
                    floating elements. Inherits --glow from the palette. */}
                <span aria-hidden className="take-halo" />

                {/* Back card - full diagnostic PDF page. Sits at the top,
                    tilted slightly counter-clockwise. width caps at 86%
                    so the front card always shows beside/below it. */}
                <div className="take-back relative w-[86%] origin-bottom-left">
                  <div className="relative overflow-hidden rounded-[6px] ring-1 ring-foreground/15 shadow-[0_30px_80px_-32px_rgba(5,18,26,0.9)]">
                    <Image
                      src="/take/reportpdf.png"
                      alt="A page from the personalised diagnostic PDF - your full report composed around your inputs"
                      width={988}
                      height={769}
                      sizes="(max-width: 640px) 80vw, (max-width: 1024px) 60vw, 36vw"
                      className="block h-auto w-full"
                    />
                  </div>
                </div>

                {/* Front card - summary, sits below + right, opposite
                    tilt. Negative margin pulls it up so the cards visually
                    overlap; the absolute-positioned variant produced too
                    much vertical dead space at small widths. */}
                <div className="take-front relative -mt-[18%] ml-auto w-[78%] origin-top-right">
                  <div className="relative overflow-hidden rounded-[6px] ring-1 ring-foreground/25 shadow-[0_34px_70px_-26px_rgba(5,18,26,0.95)]">
                    <Image
                      src="/take/reportsummary.png"
                      alt="The summary card - readiness index with the four pillars at a glance"
                      width={1792}
                      height={815}
                      sizes="(max-width: 640px) 70vw, (max-width: 1024px) 50vw, 28vw"
                      className="block h-auto w-full"
                    />
                  </div>
                </div>

                {/* Audio chip - third deliverable as a small badge tag.
                    Positioned at the upper-right corner of the deck on
                    desktop; on mobile it sits even higher so it never
                    overlaps the score circle inside the PDF. */}
                <div className="take-audio absolute right-1 -top-3 flex items-center gap-2 rounded-full bg-card/95 px-2.5 py-1.5 ring-1 ring-foreground/25 shadow-[0_22px_44px_-24px_rgba(5,18,26,0.9)] backdrop-blur-sm sm:-top-4 sm:right-4 sm:gap-3 sm:px-3.5 sm:py-2.5">
                  <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center sm:h-8 sm:w-8">
                    <Image
                      src="/take/audiofile.png"
                      alt=""
                      width={64}
                      height={64}
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="pr-1 text-[10px] uppercase tracking-[0.18em] text-ink sm:text-[11.5px]">
                    Audio composition
                  </span>
                </div>
              </div>
            </ParallaxImage>

            <figcaption className="mt-8 flex items-center gap-4 sm:mt-10">
              <span className="hairline-anim block h-px w-10 bg-foreground/40" />
              <span className="eyebrow text-foreground/60">
                What is delivered
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
                    <span>
                      {it.title}
                      {it.paid && (
                        <sup
                          className="ml-0.5 align-super font-sans text-[0.5em] font-semibold not-italic text-foreground/55"
                          title="Paid - unlocks after your assessment"
                          aria-label="paid add-on"
                        >
                          *
                        </sup>
                      )}
                    </span>
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.8] text-foreground/80 sm:text-base">
                    {it.body}
                  </p>
                </div>
              </Reveal>
            ))}
            <Reveal
              as="li"
              delay={300 + items.length * 80}
              className="pt-6 text-[13px] leading-[1.7] text-foreground/55"
            >
              <span className="text-foreground/70">*</span> The full diagnostic
              PDF is a paid add-on, available to unlock after your assessment.
              Your score, audio composition, and summary are free.
            </Reveal>
          </ol>
        </div>
      </div>
    </section>
  )
}
