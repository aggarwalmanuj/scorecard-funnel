"use client"

import Link from "next/link"
import { Linkedin } from "lucide-react"

const cols = [
  {
    heading: "The reading",
    links: [
      { label: "The Pain", href: "#sanctuary" },
      { label: "The Reading", href: "#how-it-works" },
      { label: "What you carry home", href: "#take-home" },
      { label: "Voices", href: "#voices" },
      { label: "Notes", href: "#notes" },
    ],
  },
  {
    heading: "Quiet pages",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
] as const

export function MinimalFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            {/* Wordmark slot - kept blank intentionally; a custom logo will
                replace this block. The pulse-dot is the same anchor used in
                the header so the brand placeholder is consistent. */}
            <Link
              href="/"
              aria-label="Home"
              className="inline-flex items-center gap-3"
            >
              <span className="brand-mark brand-mark-sm" aria-hidden />
              <span className="sr-only">Home</span>
            </Link>
            <p className="mt-6 max-w-sm text-[14px] leading-[1.8] text-foreground/75">
              A diagnostic for life and work. A precise reflection of what is
              quietly running you, so the next decision can come from
              somewhere calmer.
            </p>
            <p className="mt-4 max-w-sm font-serif-italic text-[15px] text-foreground/70">
              Reviewed in the Mensa Research Journal.
            </p>
          </div>

          {cols.map((col) => (
            <div key={col.heading} className="lg:col-span-3">
              <p className="eyebrow text-foreground/65">{col.heading}</p>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="font-serif text-[15px] text-ink/85 transition-opacity hover:opacity-70"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="lg:col-span-1 flex justify-start lg:justify-end">
            <Link
              href="https://www.linkedin.com/company/tetranoodle"
              aria-label="LinkedIn"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-ink hover:text-ink"
            >
              <Linkedin className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        <div className="hairline mt-14" />
        <div className="mt-6 flex flex-col items-start justify-between gap-3 text-[12px] tracking-wide text-foreground/55 sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
          <p className="font-serif-italic text-[13px]">
            Composed quietly. Read at your own pace.
          </p>
        </div>
      </div>
    </footer>
  )
}
