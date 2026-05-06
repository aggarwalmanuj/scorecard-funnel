"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Gauge, Volume2, FileText, FileBarChart2, Check } from "lucide-react"

const items = [
  {
    icon: Gauge,
    title: "Your Unfair Advantage Score",
    description:
      "A precise score across all 7 dimensions - showing exactly where your hidden pattern lives.",
  },
  {
    icon: Volume2,
    title: "Personalized Audio Explanation",
    description:
      "A custom audio summary of your results - explaining what your score means and what’s behind it.",
  },
  {
    icon: FileText,
    title: "Summary Report",
    description: "A clear breakdown of your top strength and your primary hidden constraint.",
  },
  {
    icon: FileBarChart2,
    title: "Full Diagnostic PDF Report",
    description:
      "Your complete personalized report with specific insights and recommended next steps.",
  },
]

export function DeliverablesSection() {
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
      className="py-20 sm:py-24 md:py-32 bg-secondary/30 overflow-hidden"
      id="deliverables"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className={`max-w-2xl mb-12 sm:mb-16 ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-primary bg-secondary neu-border-primary mb-6">
            What you get
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-[1.05]">
            Four artifacts -
            <span className="block text-primary mt-1">built around your inputs.</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {items.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className={`group relative p-7 sm:p-8 rounded-2xl bg-card transition-all duration-300 hover:-translate-y-0.5 ${
                  idx % 3 === 0 ? "neu-card-primary" : "neu-card"
                } ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
                style={{ animationDelay: `${100 + idx * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Check className="w-4 h-4 text-primary" aria-hidden />
                      <h3 className="font-black tracking-tight text-[18px] sm:text-[20px] text-foreground leading-tight">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-[14px] sm:text-[15px] text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div
          className={`mt-12 text-center ${
            isVisible ? "animate-fade-in-up delay-500" : "opacity-0"
          }`}
        >
          <Button
            asChild
            size="lg"
            className="group h-12 sm:h-14 px-8 text-base font-extrabold rounded-xl neu-border-primary neu-shadow-primary-sm neu-btn-press"
          >
            <Link href="/challenge/audience">
              Find My Score
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
