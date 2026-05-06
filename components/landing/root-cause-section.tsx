"use client"

import { useEffect, useRef, useState } from "react"

export function RootCauseSection() {
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
      className="py-20 sm:py-24 md:py-32 lg:py-40 bg-secondary/30 overflow-hidden"
      id="root-cause"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <span
          className={`inline-block px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-primary bg-secondary neu-border-primary mb-6 ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
        >
          The Real Constraint
        </span>

        <h2
          className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-[1.05] ${
            isVisible ? "animate-fade-in-up delay-100" : "opacity-0"
          }`}
        >
          Most problems that won&apos;t go away
          <span className="block text-primary mt-2">aren&apos;t strategy problems.</span>
        </h2>

        <p
          className={`mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed ${
            isVisible ? "animate-fade-in-up delay-200" : "opacity-0"
          }`}
        >
          They have a root cause nobody has looked at yet.
        </p>

        {/* Three-step "tried" strip */}
        <div
          className={`mt-12 sm:mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-3xl mx-auto ${
            isVisible ? "animate-fade-in-up delay-300" : "opacity-0"
          }`}
        >
          {[
            { kicker: "01", text: "You’ve tried harder." },
            { kicker: "02", text: "Hired better." },
            { kicker: "03", text: "Optimized more." },
          ].map((s) => (
            <div
              key={s.kicker}
              className="p-5 rounded-2xl bg-card neu-card text-left transition-all duration-300 hover:-translate-y-0.5"
            >
              <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-primary/70 mb-2">
                {s.kicker}
              </span>
              <p className="text-foreground font-bold leading-snug">{s.text}</p>
            </div>
          ))}
        </div>

        <p
          className={`mt-10 text-xl sm:text-2xl font-extrabold text-foreground ${
            isVisible ? "animate-fade-in-up delay-400" : "opacity-0"
          }`}
        >
          The same ceiling keeps appearing.
        </p>

        {/* Pull-quote box */}
        <div
          className={`mt-10 sm:mt-12 mx-auto max-w-2xl p-7 sm:p-8 rounded-2xl bg-card neu-card-primary text-left ${
            isVisible ? "animate-fade-in-up delay-500" : "opacity-0"
          }`}
        >
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            That&apos;s not a strategy problem. That&apos;s a{" "}
            <span className="text-foreground font-extrabold underline decoration-primary decoration-2 underline-offset-4">
              nervous system problem
            </span>
            .
          </p>
          <p className="mt-3 text-base sm:text-lg text-foreground leading-relaxed font-bold">
            And until you find the specific pattern running against you - nothing else
            fully works.
          </p>
        </div>
      </div>
    </section>
  )
}
