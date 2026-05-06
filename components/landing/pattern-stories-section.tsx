"use client"

import { useEffect, useRef, useState } from "react"
import { Quote } from "lucide-react"

const stories = [
  {
    role: "Senior Executive",
    body:
      "A senior executive had the same leadership ceiling for years. Three consultants. Two restructures. Same result. One AI Merge session found what was underneath. Within weeks his team was executing without him. Business, marriage and key relationships transformed simultaneously.",
    metric: "Team executing without him in weeks",
  },
  {
    role: "Founder",
    body:
      "A founder spent 13 years building a fashion brand helping women feel beautiful - while unable to feel it herself. One session surfaced the root.",
    pull: "I am starting to believe I am beautiful.",
    metric: "On camera, same day",
  },
  {
    role: "78-year-old Business Leader",
    body:
      "Carried a weight for decades he couldn’t name. It moved in 20 minutes.",
    pull: "Love is unconditional. What we built together was real.",
    metric: "20 minutes",
  },
  {
    role: "Fortune 500 Executive",
    body:
      "6X’d his income in 6 months. Not because his strategy changed. Because something that was in the way finally wasn’t.",
    metric: "6X income in 6 months",
  },
]

export function PatternStoriesSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.05 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-24 md:py-32 lg:py-40"
      id="pattern-stories"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className={`max-w-3xl mb-14 sm:mb-16 ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-primary bg-secondary neu-border-primary mb-6">
            Outcomes
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-[1.05]">
            What happens when the pattern is
            <span className="block text-primary mt-1">found and removed.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Not because they worked harder. Because something that was in the way finally
            wasn’t.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {stories.map((s, idx) => (
            <div
              key={s.role}
              className={`group p-7 sm:p-8 rounded-2xl bg-card transition-all duration-300 hover:-translate-y-0.5 ${
                idx % 3 === 0 ? "neu-card-primary" : "neu-card"
              } ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${100 + idx * 90}ms` }}
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-3">
                {s.role}
              </span>

              <p className="text-foreground leading-relaxed text-[15px] sm:text-[16px]">
                {s.body}
              </p>

              {s.pull && (
                <div className="mt-5 p-4 rounded-xl border-l-4 border-primary bg-secondary/50 relative">
                  <Quote
                    className="absolute -top-2 -left-2 w-6 h-6 text-primary/40 fill-primary/20"
                    aria-hidden
                  />
                  <p className="text-foreground font-bold italic leading-snug">
                    “{s.pull}”
                  </p>
                </div>
              )}

              <div className="mt-5 pt-5 border-t-2 border-foreground/5 flex items-center justify-between gap-3">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  Result
                </span>
                <span className="text-[13px] font-extrabold text-primary text-right">
                  {s.metric}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
