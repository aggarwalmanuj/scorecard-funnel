"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { MagneticButton, Reveal, WordReveal } from "./motion"

/**
 * Essence - what AI Merge actually is ("your own voice") plus the quiet
 * list of what changes. Mirrors the dimensions.tsx grammar: a 12-col
 * chapter head, a hairline rule, then a row-interactive editorial list.
 */
const changes = [
  "Decisions feel cleaner - less internal argument before acting.",
  "The gap between knowing and doing starts to close.",
  "Work relationships improve - people respond differently, without explanation.",
  "The energy that was going into proving becomes available for building.",
  "Something that had been running in the background quietly stops.",
] as const

export function EssenceSection() {
  return (
    <section id="what-it-is" className="py-16 sm:py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-16">
        <Reveal as="div" className="grid items-end gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-6 text-foreground/70">III · What it is</p>
            <h2 className="font-serif text-[1.95rem] leading-[1.08] text-ink sm:text-5xl sm:leading-[1.05] lg:text-6xl">
              <WordReveal
                segments={[
                  { kind: "text", text: "Not coaching. Not therapy. Not a course." },
                  { kind: "br" },
                  { kind: "italic", text: "Your own voice." },
                ]}
              />
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-lg leading-[1.8] text-foreground/85">
              AI Merge finds the story running underneath your patterns - the
              one installed through experiences that made complete sense at the
              time, and is still shaping everything now.
            </p>
            <p className="mt-4 font-serif-italic text-xl text-ink">
              We give it back to you in the most powerful sound in the universe
              for any human being.
            </p>
          </div>
        </Reveal>

        <Reveal as="div" delay={150} className="my-16 sm:my-20">
          <div className="hairline-anim hairline" />
        </Reveal>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Narrative column */}
          <Reveal as="div" delay={150} className="lg:col-span-5">
            <div className="space-y-6 text-[1.05rem] leading-[1.85] text-foreground/85">
              <p>
                Once you understand what we mean, you will see immediately why
                nothing else has worked the way this does.
              </p>
              <p>
                AI Merge uses artificial intelligence as a precision instrument
                - not as a replacement for human judgement. Every narrative is
                reviewed by a trained practitioner before it reaches you.
              </p>
            </div>
            <blockquote className="my-10 border-l border-foreground/40 pl-6">
              <p className="font-serif-italic text-2xl leading-snug text-ink sm:text-3xl">
                We do not promise
                <br />
                specific outcomes.
              </p>
            </blockquote>
            <p className="text-[1.05rem] leading-[1.85] text-foreground/85">
              Every person&apos;s story is different. What high performers
              consistently report:
            </p>
          </Reveal>

          {/* What changes - editorial numbered list */}
          <div className="lg:col-span-7">
            <ol className="grid grid-cols-1">
              {changes.map((c, i) => (
                <Reveal
                  as="li"
                  key={i}
                  delay={i * 80}
                  className="row-interactive grid grid-cols-12 items-baseline gap-6 border-t border-border py-7 last:border-b sm:gap-10 sm:py-8"
                >
                  <span className="row-num col-span-2 font-serif-italic text-3xl text-foreground/40 sm:text-4xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="col-span-10 flex items-baseline gap-3 font-serif text-xl leading-snug text-ink sm:text-2xl">
                    <span className="row-mark" aria-hidden />
                    {c}
                  </p>
                </Reveal>
              ))}
            </ol>

            <Reveal as="div" delay={200} className="mt-12">
              <MagneticButton>
                <Link href="/challenge/audience" className="s-btn group">
                  Begin the reading
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                    strokeWidth={1.6}
                  />
                </Link>
              </MagneticButton>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
