"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { MagneticButton, Reveal } from "./motion"

const dimensions = [
  {
    name: "Embodiment",
    question:
      "Are you operating from your full physical and mental capacity?",
  },
  {
    name: "Purpose",
    question: "Do you have clear direction driving your decisions?",
  },
  {
    name: "Identity",
    question:
      "Is who you are being aligned with what you are trying to build?",
  },
  {
    name: "Relationships",
    question: "Are your key relationships fueling or quietly draining you?",
  },
  {
    name: "Creativity",
    question: "Are you operating at your growth edge - or playing it safe?",
  },
  {
    name: "Time",
    question: "Is urgency running your life, or are you running it?",
  },
  {
    name: "Peace of Mind",
    question: "Is there a quiet that supports your best thinking?",
  },
] as const

export function DimensionsSection() {
  return (
    <section
      id="how-it-works"
      className="relative py-16 sm:py-28 lg:py-36"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-16">
        <Reveal as="div" className="grid items-end gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-6 text-foreground/70">
              VI · The Reading
            </p>
            <h2 className="font-serif text-[1.95rem] leading-[1.08] text-ink sm:text-5xl sm:leading-[1.05] lg:text-6xl">
              A mirror.
              <span className="block font-serif-italic text-foreground">
                Not a test.
              </span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-lg leading-[1.8] text-foreground/85">
              Ten minutes. Five honest questions. No labels, no archetypes.
            </p>
            <p className="mt-4 font-serif-italic text-xl text-ink">
              The reading does not give you new information. It gives you the
              language for what you already knew.
            </p>
          </div>
        </Reveal>

        <Reveal as="div" delay={150} className="my-16 sm:my-20">
          <div className="hairline-anim hairline" />
        </Reveal>

        {/* Editorial numbered list - generous, hairline-divided. Each row
            has a hover state: the number shifts right, a small mark draws
            in beside it, and the row itself indents slightly. */}
        <ol className="grid grid-cols-1">
          {dimensions.map((d, i) => (
            <Reveal
              as="li"
              key={d.name}
              delay={i * 80}
              className="row-interactive grid grid-cols-12 items-baseline gap-6 border-t border-border py-7 last:border-b sm:gap-10 sm:py-8"
            >
              <span className="row-num col-span-2 font-serif-italic text-3xl text-foreground/40 sm:text-4xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="col-span-10 grid items-baseline gap-y-3 sm:grid-cols-12 sm:gap-x-8">
                <p className="flex items-baseline gap-3 font-serif text-2xl leading-tight text-ink sm:col-span-4 sm:text-3xl">
                  <span className="row-mark" aria-hidden />
                  {d.name}
                </p>
                <p className="text-[15px] leading-[1.8] text-foreground/80 sm:col-span-8 sm:text-base">
                  {d.question}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>

        <Reveal as="div" delay={200} className="mt-14 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl font-serif-italic text-2xl leading-snug text-ink sm:text-[28px]">
            Seven dimensions, named precisely. One pattern, finally surfaced.
          </p>
          <MagneticButton>
            <Link
              href="/challenge/audience"
              className="s-btn group shrink-0"
            >
              Begin the reading
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
