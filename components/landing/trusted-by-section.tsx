"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { Award, Mic2, Cpu, BookOpen } from "lucide-react"

const credentials = [
  { icon: Cpu, label: "Patents", value: "4 in human-AI decision systems" },
  { icon: Mic2, label: "Keynote", value: "United Nations" },
  { icon: BookOpen, label: "Published in", value: "Mensa Research Journal" },
  { icon: Award, label: "Documented", value: "$500M+ business impact" },
]

const logos: Array<{ src: string; alt: string }> = [
  { src: "/logos/microsoft.png", alt: "Microsoft" },
  { src: "/logos/ibm.png", alt: "IBM" },
  { src: "/logos/tmobile.png", alt: "T-Mobile" },
  { src: "/logos/pearson.png", alt: "Pearson" },
  { src: "/logos/un.png", alt: "United Nations" },
]

export function TrustedBySection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-24 md:py-28 bg-secondary/30"
      id="trusted-by"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className={`max-w-3xl mx-auto text-center ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-primary bg-secondary neu-border-primary mb-6">
            Trusted across three continents
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-[1.05]">
            The work behind the score.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Clients include executives and teams from organizations like Microsoft, IBM,
            T-Mobile, and Pearson. Keynote speaker at the United Nations.
          </p>
        </div>

        {/* Logo strip - actual brand marks. Greyscale by default with a subtle
            hover lift to keep the row understated and editorial. */}
        <ul
          className={`mt-12 sm:mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-14 ${
            isVisible ? "animate-fade-in-up delay-200" : "opacity-0"
          }`}
        >
          {logos.map((logo) => (
            <li
              key={logo.alt}
              className="relative h-9 sm:h-10 w-28 sm:w-32 grayscale opacity-70 transition-all duration-300 hover:opacity-100 hover:grayscale-0 hover:-translate-y-0.5"
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                fill
                sizes="(min-width: 640px) 128px, 112px"
                className="object-contain"
              />
            </li>
          ))}
        </ul>

        {/* Credentials grid */}
        <div className="mt-14 sm:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {credentials.map((c, idx) => {
            const Icon = c.icon
            return (
              <div
                key={c.label}
                className={`group p-6 rounded-2xl bg-card neu-card transition-all duration-300 hover:-translate-y-0.5 ${
                  isVisible ? "animate-fade-in-up" : "opacity-0"
                }`}
                style={{ animationDelay: `${300 + idx * 80}ms` }}
              >
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground mb-1">
                  {c.label}
                </p>
                <p className="text-sm sm:text-[15px] font-extrabold text-foreground leading-tight">
                  {c.value}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
