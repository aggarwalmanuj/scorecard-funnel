"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Cpu, FileText, Award, Users } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const credentials = [
  {
    icon: Cpu,
    label: "Powered by",
    value: "AIMerge",
  },
  {
    icon: FileText,
    label: "Published in",
    value: "Mensa Research Journal",
  },
  {
    icon: Award,
    label: "Patents",
    value: "4 in human-AI decision systems",
  },
  {
    icon: Users,
    label: "Used by",
    value: "Fortune 500 leaders",
  },
]

export function BestSelfSection() {
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
    <section ref={sectionRef} className="py-20 sm:py-24 md:py-32 lg:py-40 bg-secondary/30 overflow-hidden" id="about">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className={`max-w-3xl ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="inline-block px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-primary bg-secondary neu-border-primary mb-6">
            Why this works
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-none">
            Your best self is not
            <span className="block text-primary mt-1">occasional.</span>
          </h2>
          <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-xl">
            It is your actual baseline.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="mt-16 sm:mt-20 grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left Column */}
          <div className={`space-y-6 ${isVisible ? 'animate-fade-in-left delay-200' : 'opacity-0'}`}>
            <p className="text-lg text-muted-foreground leading-relaxed">
              You have been there before. That morning when the thinking was clear and the decisions came easily and you moved through your day without the usual friction.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              That conversation where you saw exactly what needed to happen and everyone in the room felt it too.
            </p>

            {/* Image */}
            <div className="relative rounded-2xl overflow-hidden neu-border neu-shadow-md img-hover-zoom my-8">
              <Image
                src="/images/q2-horizon.jpg"
                alt="Leader finding clarity in stillness"
                width={600}
                height={380}
                className="w-full h-auto object-cover aspect-16/10"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white text-sm font-black drop-shadow-md">
                  Leaders operating from complete clarity
                </p>
              </div>
            </div>

            <p className="text-lg text-muted-foreground leading-relaxed">
              That version of you is not a fluke. It is not luck. It is not the result of the right sleep or the right conditions.
            </p>

            {/* Pull quote */}
            <div className="p-5 rounded-xl border-l-4 border-primary bg-secondary/50">
              <p className="text-lg font-bold text-foreground leading-relaxed">
                It is what you are capable of when everything unnecessary falls away.
              </p>
            </div>

            <div className="pt-4">
              <Button
                size="lg"
                onClick={() => document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" })}
                className="h-12 sm:h-14 px-8 text-base font-extrabold rounded-xl neu-border-primary neu-shadow-primary-sm neu-btn-press"
              >
                Begin the experience
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right Column */}
          <div className={`space-y-6 ${isVisible ? 'animate-fade-in-right delay-300' : 'opacity-0'}`}>
            {/* Credentials Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {credentials.map((credential, index) => (
                <div
                  key={index}
                  className="group p-5 rounded-xl bg-card neu-card cursor-default"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <credential.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold mb-1">{credential.label}</p>
                  <p className="text-sm font-extrabold text-foreground">{credential.value}</p>
                </div>
              ))}
            </div>

            {/* The Problem Card */}
            <div className="p-7 sm:p-8 rounded-2xl bg-card neu-card-primary">
              <h3 className="text-xl sm:text-2xl font-black text-foreground">The problem is not finding it.</h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Most leaders at your level have found it - in retreats, in rare moments, in the right conversations.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The problem is <span className="text-foreground font-extrabold underline decoration-primary decoration-2 underline-offset-4">making it stay.</span>
              </p>
              <div className="mt-6 pt-6 border-t-2 border-primary/15">
                <p className="text-foreground leading-relaxed">
                  And when you make the decisions that come from that place - not from pressure, not from urgency, but from complete clarity - something else shifts too.
                </p>
                <p className="text-primary font-black mt-4 text-xl">
                  Not just the work. You.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
