"use client"

import { BookOpen, Footprints, CalendarCheck } from "lucide-react"

/**
 * The 30-day arc as a three-node timeline - horizontal on desktop,
 * railed-vertical on mobile. Content mirrors the report's actual structure
 * (read -> one move -> day-30 evidence check); no invented milestones.
 */
const NODES = [
  {
    icon: BookOpen,
    phase: "Day 1",
    title: "Read your pattern",
    body: "Ten minutes with page one. The loop, named in your own words.",
  },
  {
    icon: Footprints,
    phase: "Week 1",
    title: "One small move",
    body: "A single action anchored to something already in your week. Under ten minutes.",
  },
  {
    icon: CalendarCheck,
    phase: "Day 30",
    title: "Check the evidence",
    body: "Your Evidence Log, read back. What actually moved - in your words, not ours.",
  },
] as const

export function PlanTimeline() {
  return (
    <ol className="relative flex flex-col gap-8 sm:flex-row sm:gap-6">
      {/* Connecting line - vertical rail on mobile, horizontal on desktop */}
      <span
        aria-hidden
        className="absolute bottom-4 left-[19px] top-4 w-px sm:hidden"
        style={{
          background:
            "linear-gradient(180deg, var(--signal), color-mix(in srgb, var(--signal) 25%, transparent))",
        }}
      />
      <span
        aria-hidden
        className="absolute left-8 right-8 top-[19px] hidden h-px sm:block"
        style={{
          background:
            "linear-gradient(90deg, var(--signal), color-mix(in srgb, var(--signal) 25%, transparent))",
        }}
      />
      {NODES.map((n) => {
        const Icon = n.icon
        return (
          <li key={n.phase} className="relative flex flex-1 gap-4 sm:flex-col sm:gap-3">
            <span
              className="z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-card"
              style={{
                borderColor: "color-mix(in srgb, var(--signal) 55%, transparent)",
                color: "var(--signal)",
                boxShadow: "0 0 18px color-mix(in srgb, var(--signal) 25%, transparent)",
              }}
            >
              <Icon className="h-4 w-4" strokeWidth={1.7} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/50">
                {n.phase}
              </p>
              <p className="mt-0.5 font-serif text-[16px] leading-snug text-ink">
                {n.title}
              </p>
              <p className="mt-1 text-[13.5px] leading-[1.65] text-foreground/70">
                {n.body}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
