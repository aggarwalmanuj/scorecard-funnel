"use client"

import { Clock, Eye, Target, Compass, Sparkles, Check } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const outcomes = [
  {
    icon: Target,
    text: "What is actually creating the gap - named precisely",
  },
  {
    icon: Eye,
    text: "Why the right conditions have not been enough",
  },
  {
    icon: Compass,
    text: "What your best self looks like as your permanent state",
  },
  {
    icon: Check,
    text: "What becomes possible when it is",
  },
]

const steps = [
  {
    number: "01",
    icon: Clock,
    title: "Ten minutes. Five questions.",
    description: "In ten minutes - through five honest questions - the mirror clears. No lengthy assessments. No complex frameworks.",
  },
  {
    number: "02",
    icon: Eye,
    title: "Not new information.",
    description: "What surfaces is a precise reflection of the specific thing between you and the version of yourself you already know is possible.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Precise clarity.",
    description: "The more honest your answers - the sharper the reflection. What you receive is uniquely yours.",
  },
]

export function MirrorSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-20 sm:py-24 md:py-32 lg:py-40" id="how-it-works">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className={`max-w-3xl mx-auto text-center mb-16 sm:mb-20 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="inline-block px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-primary bg-secondary neu-border-primary mb-6">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-none">
            A mirror. Not a test.
            <span className="block text-primary mt-1">Not a tool.</span>
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Most things designed for people at your level deliver information. Frameworks. Assessments.
          </p>
          <p className="mt-3 text-lg sm:text-xl font-extrabold text-foreground">
            This does something different.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`group relative p-7 sm:p-8 rounded-2xl bg-card neu-card overflow-hidden ${isVisible ? `animate-fade-in-up delay-${(index + 1) * 100}` : 'opacity-0'} ${index === 2 ? 'sm:col-span-2 md:col-span-1' : ''}`}
            >
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border-2 border-primary/20 mb-6 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                  <step.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-foreground">{step.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Outcomes Section */}
        <div className={`mt-16 sm:mt-20 p-8 sm:p-10 md:p-12 rounded-2xl bg-secondary/50 neu-card-primary ${isVisible ? 'animate-fade-in-up delay-500' : 'opacity-0'}`}>
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-black text-foreground text-center mb-10">
              What surfaces
            </h3>
            <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
              {outcomes.map((outcome, index) => (
                <div key={index} className="flex items-start gap-4 group">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-card border-2 border-primary/30 shrink-0 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                    <outcome.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <p className="text-foreground leading-relaxed pt-2.5 font-bold">{outcome.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
