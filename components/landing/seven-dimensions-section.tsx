"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Activity,
  Compass,
  UserCircle,
  Heart,
  Zap,
  Clock,
  Brain,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const dimensions = [
  {
    icon: Activity,
    name: "Embodiment",
    question: "Are you operating from your full physical and mental capacity?",
  },
  {
    icon: Compass,
    name: "Purpose",
    question: "Do you have clear direction driving your decisions?",
  },
  {
    icon: UserCircle,
    name: "Identity",
    question: "Is who you’re being aligned with what you’re trying to build?",
  },
  {
    icon: Heart,
    name: "Relationships",
    question: "Are your key relationships fueling or draining you?",
  },
  {
    icon: Zap,
    name: "Creativity",
    question: "Are you operating at your growth edge or playing it safe?",
  },
  {
    icon: Clock,
    name: "Time",
    question: "Is urgency running your life - or are you running it?",
  },
  {
    icon: Brain,
    name: "Peace of Mind",
    question: "Is there a quiet that supports your best thinking?",
  },
] as const

// Top row gets the first 4 dimensions; bottom row gets the remaining 3 and is
// centered. This avoids the awkward "4-up grid with one orphan" layout.
const topRow = dimensions.slice(0, 4)
const bottomRow = dimensions.slice(4)

type DimensionCardProps = {
  index: number
  icon: (typeof dimensions)[number]["icon"]
  name: string
  question: string
  isVisible: boolean
}

function DimensionCard({ index, icon: Icon, name, question, isVisible }: DimensionCardProps) {
  // Highlight every third card so the visual rhythm is consistent across both rows.
  const highlight = index % 3 === 0
  return (
    <div
      className={`group relative h-full p-6 rounded-2xl bg-card transition-all duration-300 hover:-translate-y-0.5 ${
        highlight ? "neu-card-primary" : "neu-card"
      } ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
      style={{ animationDelay: `${100 + index * 70}ms` }}
    >
      <span
        className="absolute top-3 right-4 text-[44px] font-black tracking-tighter text-primary/10 leading-none select-none"
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
        <Icon className="h-5 w-5" />
      </span>

      <h3 className="font-black tracking-tight text-[18px] sm:text-[19px] text-foreground leading-tight mb-2">
        {name}
      </h3>
      <p className="text-[14px] text-muted-foreground leading-relaxed">{question}</p>
    </div>
  )
}

export function SevenDimensionsSection() {
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
    <section ref={sectionRef} id="how-it-works" className="py-20 sm:py-24 md:py-32 lg:py-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`max-w-3xl mx-auto text-center mb-14 sm:mb-16 ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-primary bg-secondary neu-border-primary mb-6">
            What it measures
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-[1.05]">
            What is Your Unfair
            <span className="block text-primary mt-1">Advantage Score?</span>
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed">
            A precise read on your performance across{" "}
            <span className="text-foreground font-extrabold">
              7 key dimensions of life and work
            </span>{" "}
            - identifying exactly where a hidden pattern is quietly limiting your results.
            Built on the AI Merge framework, peer-reviewed in the{" "}
            <span className="text-foreground font-extrabold">Mensa Research Journal</span>.
          </p>
        </div>

        {/* Top row - 4 cards. Mobile = 1col, sm = 2col, lg = 4col. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {topRow.map((d, i) => (
            <DimensionCard
              key={d.name}
              index={i}
              icon={d.icon}
              name={d.name}
              question={d.question}
              isVisible={isVisible}
            />
          ))}
        </div>

        {/* Bottom row - 3 cards. Constrained to ~75% width on lg so the cards
            keep the same width as the top row, and centered for symmetry. */}
        <div className="mt-4 sm:mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:max-w-[calc(75%+0.875rem)] lg:mx-auto">
          {bottomRow.map((d, i) => (
            <DimensionCard
              key={d.name}
              index={topRow.length + i}
              icon={d.icon}
              name={d.name}
              question={d.question}
              isVisible={isVisible}
            />
          ))}
        </div>

        <div
          className={`mt-14 sm:mt-16 text-center ${
            isVisible ? "animate-fade-in-up delay-500" : "opacity-0"
          }`}
        >
          <Button
            asChild
            size="lg"
            className="group h-12 sm:h-14 px-8 text-base font-extrabold rounded-xl neu-border-primary neu-shadow-primary-sm neu-btn-press"
          >
            <Link href="/challenge/audience">
              Find My Unfair Advantage Score
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
