"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PrivacyNotice } from "@/components/privacy-notice"
import { MagneticButton } from "./motion"

/**
 * Reservation CTA card. Originally an inline lead-capture form (first
 * name + email) that handed off to /challenge/audience via URL params;
 * we removed the inputs so the landing page only gathers commitment, not
 * data. The actual capture happens on the audience page itself, which
 * has the proper inputs, validation, and Google Sheet submission. The
 * file name + export are preserved so existing imports keep working.
 */
export function ReservationForm({
  id,
  eyebrow = "Reserve your reading",
  title = "Five quiet questions. One personal preview.",
}: {
  id?: string
  eyebrow?: string
  title?: string
}) {
  return (
    <div
      id={id}
      className="rounded-md p-6 sm:p-7"
      style={{
        backgroundColor: "color-mix(in srgb, var(--card) 92%, transparent)",
        border: "1px solid color-mix(in srgb, var(--foreground) 18%, transparent)",
        boxShadow: "0 18px 50px -35px rgba(var(--shadow-ink), 0.4)",
      }}
    >
      <p
        className="eyebrow"
        style={{ color: "color-mix(in srgb, var(--foreground) 72%, transparent)" }}
      >
        {eyebrow}
      </p>
      <p
        className="font-serif-italic mt-1.5 text-[18px] leading-snug"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </p>

      <ul
        className="mt-5 grid gap-2 text-[13.5px] leading-snug sm:text-[14px]"
        style={{ color: "color-mix(in srgb, var(--foreground) 80%, transparent)" }}
      >
        {[
          "Ten quiet minutes",
          "A precise read across seven dimensions",
          "Delivered the same day",
        ].map((line) => (
          <li key={line} className="flex items-baseline gap-2.5">
            <span
              aria-hidden
              className="mt-2 inline-block h-px w-3 shrink-0"
              style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <MagneticButton>
          <Link
            href="/challenge/audience"
            className="s-btn group w-full justify-center whitespace-nowrap"
          >
            Begin the reading
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
              strokeWidth={1.6}
            />
          </Link>
        </MagneticButton>
      </div>

      <PrivacyNotice className="mt-5" />
    </div>
  )
}
