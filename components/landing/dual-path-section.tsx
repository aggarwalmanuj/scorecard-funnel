"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { User, Users, ArrowRight, Shield } from "lucide-react"

export function DualPathSection() {
  const router = useRouter()
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

  const cards: Array<{
    badge: string
    title: string
    desc: string
    Icon: typeof User
    bullets: string[]
  }> = [
    {
      badge: "Personal Path",
      title: "Individual",
      desc: "Unlock your personal performance. Find the hidden pattern quietly limiting your results.",
      Icon: User,
      bullets: ["10-min personal diagnostic", "Score across 7 dimensions", "Private to you"],
    },
    {
      badge: "Organizational Path",
      title: "Team & Organization",
      desc: "Optimize your leadership team. Identify the structural constraint limiting collective performance.",
      Icon: Users,
      bullets: ["Team-level diagnostic", "Cross-functional pattern lens", "Built for senior leadership"],
    },
  ]

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-24 md:py-32 lg:py-40"
      id="paths"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className={`max-w-3xl mx-auto text-center mb-12 sm:mb-16 ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-primary bg-secondary neu-border-primary mb-6">
            Two paths · Same diagnostic
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-[1.05]">
            Works for individuals
            <span className="block text-primary mt-1">and organizations.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Whether you’re looking to unlock your personal performance or optimize your
            leadership team - Your Unfair Advantage Score identifies the root cause at any
            level.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 max-w-4xl mx-auto">
          {cards.map((card, idx) => {
            const Icon = card.Icon
            return (
              <button
                key={card.title}
                type="button"
                onClick={() => router.push("/challenge/audience")}
                className={`group relative text-left p-7 sm:p-8 rounded-2xl bg-card transition-all duration-300 active:scale-[0.99] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:ring-offset-2 ${
                  idx === 0 ? "neu-card-primary" : "neu-card"
                } ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
                style={{ animationDelay: `${100 + idx * 100}ms` }}
              >
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <Icon className="h-6 w-6" />
                </span>

                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-primary/80 mb-2">
                  {card.badge}
                </span>

                <h3 className="font-black tracking-tight text-[22px] sm:text-[24px] text-foreground leading-tight mb-2">
                  {card.title}
                </h3>

                <p className="text-[15px] text-muted-foreground leading-relaxed mb-5">
                  {card.desc}
                </p>

                <ul className="space-y-1.5 mb-5">
                  {card.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 text-[13px] text-foreground/80"
                    >
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>

                <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary group-hover:gap-2.5 transition-all duration-300">
                  Start this path
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </button>
            )
          })}
        </div>

        {/* Privacy strip */}
        <div
          className={`mt-12 sm:mt-14 max-w-3xl mx-auto p-6 sm:p-7 rounded-2xl bg-secondary/40 border-2 border-foreground/8 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
            isVisible ? "animate-fade-in-up delay-300" : "opacity-0"
          }`}
        >
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
            <Shield className="w-5 h-5" />
          </span>
          <div>
            <p className="text-foreground font-extrabold leading-snug">
              Private. Secure. Personalized.
            </p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Your data belongs to you. Always. Nothing is shared, sold or templated. Your
              score and report are built specifically around your inputs - not a generic
              algorithm.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
