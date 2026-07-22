"use client"

import Link from "next/link"
import { ArrowRight, MessageSquareText, Gauge, ScrollText } from "lucide-react"
import { MacWindow } from "@/components/visuals/mac-window"
import { ReportPreviewCard } from "@/components/visuals/report-preview"
import {
  DIMENSION_COLORS,
  DIMENSION_ICONS,
  DIMENSION_ORDER,
} from "@/components/challenge/score-visuals"
import { displayFor } from "@/lib/vertical-display"

/**
 * WHAT YOU'LL GET - the artifact demonstrated (Doorway System Block 01B).
 *
 * Immediately after the hero: a stranger ten seconds in must be able to say
 * what they physically receive. Left column carries the spec (input, time,
 * speed, output, cost - zero hedges, Zone A); right column SHOWS the
 * artifact inside an app frame with the four scored dimensions. The four
 * pillars are this product's archetype equivalent - each with its owned
 * color and icon.
 *
 * SSR-complete: no reveal gating, rings render at value in the first HTML.
 */

const SPECS = [
  {
    icon: MessageSquareText,
    title: "Answer 5 questions, in your own words",
    body: "About one pattern that keeps repeating. Messy answers welcome - there is no perfect wording.",
  },
  {
    icon: Gauge,
    title: "Instantly receive your Belief Score",
    body: "Your score (0-100), four scored dimensions, and how you compare with others carrying the same kind of pattern.",
  },
  {
    icon: ScrollText,
    title: "Your pattern, reflected back",
    body: "The repeated moment, the belief underneath it, and the exact moment to watch for - in your own words.",
  },
] as const

export function ProductShowcaseSection() {
  const display = displayFor("main")
  return (
    <section
      aria-labelledby="product-showcase-heading"
      className="relative overflow-hidden border-t border-border py-20 sm:py-28"
    >
      {/* Atmosphere - dimension-colored orbs, pure decoration */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute -right-24 top-10 h-72 w-72 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: DIMENSION_COLORS.directionClarity }}
        />
        <div
          className="absolute -left-24 bottom-0 h-64 w-64 rounded-full opacity-[0.06] blur-3xl"
          style={{ background: DIMENSION_COLORS.decisionReadiness }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        {/* Copy + spec column */}
        <div>
          <p className="eyebrow mb-5 text-foreground/70">
            <span className="mr-3 inline-block h-px w-6 align-middle bg-foreground/40" />
            What you&apos;ll get - free, in about 10 minutes
          </p>
          <h2
            id="product-showcase-heading"
            className="font-serif text-[1.9rem] leading-[1.12] text-ink sm:text-[2.4rem]"
          >
            Five questions in.
            <span className="block font-serif-italic text-foreground">
              Your score, instantly out.
            </span>
          </h2>

          <ul className="mt-9 space-y-6">
            {SPECS.map((s) => {
              const Icon = s.icon
              return (
                <li key={s.title} className="flex items-start gap-4">
                  <span
                    className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "color-mix(in srgb, var(--signal) 16%, transparent)",
                      color: "var(--signal)",
                    }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.7} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-serif text-[17px] leading-snug text-ink">
                      {s.title}
                    </p>
                    <p className="mt-1 text-[14.5px] leading-[1.7] text-foreground/75">
                      {s.body}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* The four pillars - our archetype layer, direct-labeled */}
          <div className="mt-9 flex flex-wrap gap-2">
            {DIMENSION_ORDER.map((k) => {
              const Icon = DIMENSION_ICONS[k]
              const color = DIMENSION_COLORS[k]
              return (
                <span
                  key={k}
                  className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10.5px] uppercase tracking-[0.16em]"
                  style={{
                    borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
                    background: `color-mix(in srgb, ${color} 10%, transparent)`,
                    color,
                  }}
                >
                  <Icon className="h-3 w-3" strokeWidth={2} aria-hidden />
                  {display.pillarLabels[k].label}
                </span>
              )
            })}
          </div>

          <div className="mt-10 flex flex-col items-start gap-4">
            <Link href="/challenge/audience" className="s-btn group">
              Get your free score
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                strokeWidth={1.6}
              />
            </Link>
            <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/55">
              Free · 5 questions · About 10 minutes · No credit card
            </p>
          </div>
        </div>

        {/* Artifact column */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <MacWindow title="your-belief-score.pdf">
            <ReportPreviewCard vertical="main" />
          </MacWindow>
          <p className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-foreground/50">
            Illustrative example - yours is built from your own words
          </p>
        </div>
      </div>
    </section>
  )
}
