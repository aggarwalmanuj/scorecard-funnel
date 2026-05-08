"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { MagneticButton, ParallaxImage, Reveal } from "./motion"

const tried = [
  { label: "Strategy", value: "Helped a little. Something remained." },
  { label: "Coaching", value: "Insight, not resolution." },
  { label: "Better sleep", value: "Better mornings. Same ceiling." },
  { label: "Therapy", value: "Words for the surface - not the source." },
] as const

export function SanctuarySection() {
  return (
    <section
      id="sanctuary"
      className="bg-secondary/60 py-16 sm:py-28 lg:py-36"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-16">
        <Reveal as="div" className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-6 text-foreground/70">V · The pain</p>
            <h2 className="font-serif text-[1.95rem] leading-[1.08] text-ink sm:text-5xl sm:leading-[1.05] lg:text-6xl">
              You&apos;ve already tried
              <span className="block font-serif-italic text-foreground">
                the obvious things.
              </span>
            </h2>
          </div>
          <div className="lg:col-span-7 lg:pt-10">
            <p className="max-w-xl text-lg leading-[1.8] text-foreground/85">
              Strategy. Coaching. Better sleep. Maybe therapy. They helped - and
              still, something remains.
            </p>
          </div>
        </Reveal>

        <Reveal as="div" delay={200} className="my-16 sm:my-20">
          <div className="hairline-anim hairline" />
        </Reveal>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
          {/* Narrative column */}
          <Reveal as="div" delay={200} className="lg:col-span-6">
            <div className="space-y-6 text-[1.05rem] leading-[1.85] text-foreground/85">
              <p>
                That&apos;s not because you didn&apos;t try hard enough. It&apos;s
                because those approaches work on the surface. The Reading works
                underneath.
              </p>
              <p>
                There is a specific pattern in your nervous system - installed
                by experience, running silently - quietly recreating the same
                stress, the same friction, the same feeling that something is
                slightly off.
              </p>
            </div>

            <figure className="my-14">
              <ParallaxImage amount={20}>
                <div className="img-hover-zoom relative overflow-hidden rounded-sm">
                  <Image
                    src="/images/q2-horizon.jpg"
                    alt="A still composed by morning light - the pattern, brought into the room"
                    width={960}
                    height={720}
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    className="aspect-4/3 h-auto w-full object-cover"
                  />
                </div>
              </ParallaxImage>
              <figcaption className="mt-4 flex items-center gap-4">
                <span className="h-px w-10 bg-foreground/40" />
                <span className="eyebrow text-foreground/60">
                  The pattern, brought into the room
                </span>
              </figcaption>
            </figure>

            <div className="space-y-6 text-[1.05rem] leading-[1.85] text-foreground/85">
              <p>
                Most never find it. The pattern is older than the stress it now
                causes. It cannot be willed away - only met, named, and allowed
                to resolve.
              </p>

              <blockquote className="my-10 border-l border-foreground/40 pl-6">
                <p className="font-serif-italic text-2xl leading-snug text-ink sm:text-3xl">
                  The Reading finds it
                  <br />
                  in ten minutes.
                </p>
              </blockquote>
            </div>

            <div className="pt-4">
              <MagneticButton>
                <Link href="/challenge/audience" className="s-btn group">
                  Begin the reading
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
                    strokeWidth={1.6}
                  />
                </Link>
              </MagneticButton>
            </div>
          </Reveal>

          {/* "What you've tried" + the shift */}
          <Reveal as="div" delay={300} className="lg:col-span-6">
            <dl className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {tried.map((c, i) => (
                <div
                  key={c.label}
                  className={`p-6 transition-colors duration-500 hover:bg-card sm:p-8 ${
                    i < 2 ? "sm:border-b sm:border-border" : ""
                  }`}
                >
                  <dt className="eyebrow text-foreground/60">{c.label}</dt>
                  <dd className="mt-3 font-serif text-xl leading-snug text-ink">
                    {c.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="relative mt-14">
              <p className="eyebrow mb-6 text-foreground/70">The shift</p>
              <h3 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
                Managing what you feel.
                <span className="block font-serif-italic text-foreground/80">
                  Removing what causes it.
                </span>
              </h3>
              <div className="mt-8 space-y-5 text-[1.05rem] leading-[1.85] text-foreground/85">
                <p>
                  Most programs teach you to manage how you feel. The Reading
                  removes what is causing it.
                </p>
                <p>
                  The difference is the difference between carrying something
                  lighter - and putting it down permanently.
                </p>
                <div className="my-6 h-px w-16 bg-foreground/30" />
                <p>
                  What changes here doesn&apos;t need maintenance. It becomes
                  your new baseline.
                </p>
                <p className="pt-2 font-serif text-xl text-ink sm:text-2xl">
                  Not coping.{" "}
                  <span className="font-serif-italic">Resolution.</span>
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
