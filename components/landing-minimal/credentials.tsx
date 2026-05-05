"use client"

import Image from "next/image"
import { Reveal } from "./motion"

const logos = [
  { src: "/logos/microsoft.png", alt: "Microsoft" },
  { src: "/logos/ibm.png", alt: "IBM" },
  { src: "/logos/tmobile.png", alt: "T-Mobile" },
  { src: "/logos/pearson.png", alt: "Pearson" },
  { src: "/logos/un.png", alt: "United Nations" },
] as const

const credentials = [
  { label: "Patents", value: "Four in human–AI decision systems" },
  { label: "Keynote", value: "United Nations" },
  { label: "Published", value: "Mensa Research Journal" },
  { label: "Documented", value: "$500M+ business impact" },
] as const

export function CredentialsSection() {
  return (
    <section id="guides" className="bg-secondary/60 py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
        <Reveal as="div" className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-6 text-foreground/70">VI · Trusted by</p>
            <h2 className="font-serif text-3xl leading-[1.08] text-ink sm:text-4xl">
              The work composed
              <span className="block font-serif-italic text-foreground">
                behind the reading.
              </span>
            </h2>
          </div>

          <div className="lg:col-span-8">
            <ul className="grid grid-cols-2 items-center gap-x-8 gap-y-8 sm:grid-cols-5">
              {logos.map((logo, i) => (
                <Reveal
                  as="li"
                  key={logo.alt}
                  delay={150 + i * 80}
                  className="relative h-8 sm:h-10"
                >
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    fill
                    sizes="(min-width: 640px) 110px, 90px"
                    className="object-contain object-left opacity-60 grayscale transition-all duration-700 hover:opacity-100 hover:grayscale-0"
                  />
                </Reveal>
              ))}
            </ul>

            <dl className="mt-14 grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-10">
              {credentials.map((c, i) => (
                <Reveal
                  as="div"
                  key={c.label}
                  delay={400 + i * 90}
                  className="flex items-baseline justify-between gap-4 border-t border-border pt-4 transition-colors duration-500 hover:border-ink/40"
                >
                  <dt className="eyebrow text-foreground/60">{c.label}</dt>
                  <dd className="text-right font-serif text-[16px] leading-snug text-ink">
                    {c.value}
                  </dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
