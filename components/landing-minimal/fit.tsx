"use client"

import { Reveal } from "./motion"

/**
 * Fit - the honest "is this for you" qualification. Two columns built on
 * the sanctuary.tsx tried-grid grammar: a divided <dl> of short serif
 * lines, plus the acute-crisis disclaimer kept verbatim.
 */
const yes = [
  "You are already achieving, and want to move without the friction.",
  "You are self-aware, and willing to be honest about what is running underneath.",
  "You are ready to see something true about yourself.",
] as const

const no = [
  "You want a quick fix or a hack.",
  "You already know your story, and are not ready to change it.",
  "You are in acute crisis - please seek clinical support first.",
] as const

export function FitSection() {
  return (
    <section id="fit" className="py-16 sm:py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-16">
        <Reveal as="div" className="grid items-end gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-6 text-foreground/70">VIII · Is this for you</p>
            <h2 className="font-serif text-[1.95rem] leading-[1.08] text-ink sm:text-5xl sm:leading-[1.05] lg:text-6xl">
              Honest about
              <span className="block font-serif-italic text-foreground">
                who it is for.
              </span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-10">
            <p className="max-w-xl text-lg leading-[1.8] text-foreground/85">
              This works best for a particular kind of person, at a particular
              moment. It is fine if that is not you yet.
            </p>
          </div>
        </Reveal>

        <Reveal as="div" delay={150} className="my-16 sm:my-20">
          <div className="hairline-anim hairline" />
        </Reveal>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal as="div" delay={150}>
            <p className="eyebrow mb-7 text-foreground/65">
              <span className="mr-3 inline-block h-px w-6 align-middle bg-foreground/40" />
              Yes, if
            </p>
            <dl className="grid grid-cols-1 divide-y divide-border border-y border-border">
              {yes.map((item, i) => (
                <div
                  key={i}
                  className="py-6 transition-colors duration-500 hover:bg-card sm:py-7"
                >
                  <dd className="font-serif text-xl leading-snug text-ink sm:text-2xl">
                    {item}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal as="div" delay={250}>
            <p className="eyebrow mb-7 text-foreground/65">
              <span className="mr-3 inline-block h-px w-6 align-middle bg-foreground/40" />
              Not for you if
            </p>
            <dl className="grid grid-cols-1 divide-y divide-border border-y border-border">
              {no.map((item, i) => (
                <div
                  key={i}
                  className="py-6 transition-colors duration-500 hover:bg-card sm:py-7"
                >
                  <dd className="font-serif-italic text-xl leading-snug text-foreground/70 sm:text-2xl">
                    {item}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
