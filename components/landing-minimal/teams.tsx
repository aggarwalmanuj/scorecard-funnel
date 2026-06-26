"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { MagneticButton, Reveal } from "./motion"

/**
 * Teams - the "also available for organisations" band. Tinted
 * (bg-secondary/60) to alternate the page rhythm, built on the shared
 * 12-col chapter-head grammar. Same CTA target as the rest of the page;
 * the audience screen is where individual-vs-team is actually chosen.
 */
export function TeamsSection() {
  return (
    <section id="teams" className="bg-secondary/60 py-16 sm:py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-16">
        <Reveal as="div" className="grid items-end gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-6 text-foreground/70">
              X · Teams &amp; organisations
            </p>
            <h2 className="font-serif text-[1.95rem] leading-[1.08] text-ink sm:text-5xl sm:leading-[1.05] lg:text-6xl">
              Same mechanism.
              <span className="block font-serif-italic text-foreground">
                A different lens.
              </span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-10">
            <p className="max-w-xl text-lg leading-[1.8] text-foreground/85">
              When leaders see themselves clearly, they lead differently. When
              teams operate from genuine self-knowledge rather than invisible
              patterns - execution changes.
            </p>
          </div>
        </Reveal>

        <Reveal as="div" delay={150} className="my-16 sm:my-20">
          <div className="hairline-anim hairline" />
        </Reveal>

        <Reveal
          as="div"
          delay={150}
          className="grid items-end gap-10 lg:grid-cols-12 lg:gap-16"
        >
          <div className="lg:col-span-7">
            <p className="font-serif text-2xl leading-snug text-ink sm:text-3xl">
              AI Merge works for leadership teams, organisations, and families.
              <span className="block font-serif-italic text-foreground/80">
                The team edition is available when you are ready.
              </span>
            </p>
          </div>
          <div className="lg:col-span-5">
            <MagneticButton>
              <Link
                href="/challenge/audience"
                className="s-btn group w-full justify-center sm:w-auto"
              >
                Get your free score
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                  strokeWidth={1.6}
                />
              </Link>
            </MagneticButton>
            <p className="mt-4 text-[13px] leading-relaxed text-foreground/55">
              Choose individual or team when you click through.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
