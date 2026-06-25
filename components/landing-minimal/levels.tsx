"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { MagneticButton, Reveal } from "./motion"

/**
 * Levels - the quiet pricing ladder. Informational only; the live paywall
 * lives in the challenge funnel (components/challenge/offer-screen.tsx),
 * which is the source of truth for tier names and prices. Rendered with
 * the take-home.tsx editorial list grammar (row-interactive + row-num).
 */
const tiers: ReadonlyArray<{
  name: string
  price: string
  body: string
  note?: string
}> = [
  {
    name: "Belief Score",
    price: "Free",
    body: "Five questions. Your score across four dimensions appears instantly - the pattern that has been running your results, named clearly for the first time.",
  },
  {
    name: "Full Report",
    price: "$47",
    body: "Your exact answers reflected back with the mechanism underneath them made visible. Concrete next moves, specific to you.",
  },
  {
    name: "Your Purpose Story",
    price: "$497",
    body: "Your first personalised narrative, built from your life and your own words. Yours permanently. What you do with it is revealed when you begin.",
    note: "Credited in full toward the Protocol if you upgrade within 30 days.",
  },
  {
    name: "Four-Week Protocol",
    price: "$1,997",
    body: "Four personalised narratives - Purpose, Past, Future, Integration. Weekly check-ins. A 28-day Signal Wall.",
    note: "Money-back guarantee: complete the intake, engage for 14 days, submit your midpoint reflection - if nothing has shifted, full refund.",
  },
  {
    name: "Elevated",
    price: "$4,997",
    body: "Everything in the Protocol, extended to eight weeks - professionally produced audio with carefully designed soundscapes, and direct practitioner access throughout.",
  },
]

export function LevelsSection() {
  return (
    <section id="levels" className="bg-secondary/60 py-16 sm:py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-16">
        <Reveal as="div" className="grid items-end gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-6 text-foreground/70">
              IX · What you receive
            </p>
            <h2 className="font-serif text-[1.95rem] leading-[1.08] text-ink sm:text-5xl sm:leading-[1.05] lg:text-6xl">
              One door in.
              <span className="block font-serif-italic text-foreground">
                As far as you choose to go.
              </span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="font-serif-italic text-xl leading-normal text-ink">
              Start free. Every level builds on the one before it - and only
              when what surfaced makes the next one relevant.
            </p>
          </div>
        </Reveal>

        <Reveal as="div" delay={150} className="my-16 sm:my-20">
          <div className="hairline-anim hairline" />
        </Reveal>

        <ol className="grid grid-cols-1">
          {tiers.map((t, i) => (
            <Reveal
              as="li"
              key={t.name}
              delay={i * 80}
              className="row-interactive grid grid-cols-12 items-baseline gap-6 border-t border-border py-7 last:border-b sm:gap-10 sm:py-8"
            >
              <span className="row-num col-span-2 font-serif-italic text-3xl text-foreground/40 sm:text-4xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="col-span-10 grid items-baseline gap-y-3 sm:grid-cols-12 sm:gap-x-8">
                <div className="flex items-baseline gap-3 sm:col-span-4">
                  <span className="row-mark shrink-0" aria-hidden />
                  <div>
                    <p className="font-serif text-2xl leading-tight text-ink sm:text-3xl">
                      {t.name}
                    </p>
                    <p className="mt-2 font-serif text-xl leading-none text-foreground/80 sm:text-2xl">
                      {t.price}
                    </p>
                  </div>
                </div>
                <div className="sm:col-span-8">
                  <p className="text-[15px] leading-[1.8] text-foreground/80 sm:text-base">
                    {t.body}
                  </p>
                  {t.note && (
                    <p className="mt-2.5 text-[13.5px] leading-[1.7] text-foreground/55">
                      {t.note}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </ol>

        <Reveal
          as="div"
          delay={200}
          className="mt-14 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="max-w-xl font-serif-italic text-2xl leading-snug text-ink sm:text-[28px]">
            Your score is free. Everything after it is a choice, not a step you
            are pushed toward.
          </p>
          <MagneticButton>
            <Link href="/challenge/audience" className="s-btn group shrink-0">
              Get your free Belief Score
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                strokeWidth={1.6}
              />
            </Link>
          </MagneticButton>
        </Reveal>
      </div>
    </section>
  )
}
