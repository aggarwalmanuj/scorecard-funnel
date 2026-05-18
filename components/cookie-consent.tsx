"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const STORAGE_KEY = "aimerge:cookie-consent"
const EVENT_NAME = "aimerge:cookie-consent"

type Choice = "accepted" | "rejected"

/**
 * GDPR cookie consent banner. Shown on first visit, dismissed once the
 * visitor has chosen Accept or Reject. The choice is persisted in
 * localStorage so it survives reloads and route changes.
 *
 * On dismissal we fire a `aimerge:cookie-consent` CustomEvent (detail:
 * "accepted" | "rejected"). Other client-side trackers (FB Pixel,
 * PostHog) can listen for it and gate their loading on consent. The
 * server-side script tags currently render unconditionally; gating
 * those is a separate refactor that the event hook makes possible.
 *
 * The banner is wrapped in a data-palette="marine" subtree so the
 * editorial tokens (--ink, --background, s-btn, etc.) resolve even
 * when mounted outside a palette wrapper (e.g. on /privacy, /terms).
 */
export function CookieConsent() {
  const [shown, setShown] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      // Privacy mode or storage disabled - we still surface the banner.
    }
    if (stored === "accepted" || stored === "rejected") return
    // Stagger the appearance behind hero animations so it never competes
    // for first-paint attention. 900ms lets the headline settle.
    const t = window.setTimeout(() => setShown(true), 900)
    return () => window.clearTimeout(t)
  }, [])

  const dismiss = (choice: Choice) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice)
    } catch {
      // No persistence available; the choice still applies for this session.
    }
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: choice }),
    )
    setExiting(true)
    window.setTimeout(() => setShown(false), 380)
  }

  if (!shown) return null

  return (
    <div
      data-palette="marine"
      role="dialog"
      aria-modal="false"
      aria-label="Cookie preferences"
      aria-live="polite"
      className={`cookie-consent fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6 ${
        exiting ? "is-exit" : ""
      }`}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-md border border-border bg-card p-5 shadow-[0_30px_80px_-30px_rgba(var(--shadow-ink),0.65)] backdrop-blur-xl sm:flex-row sm:items-start sm:gap-6 sm:p-6">
        <div className="flex-1">
          <p className="eyebrow mb-2 text-foreground/65">A quiet note</p>
          <p className="text-[14px] leading-[1.7] text-foreground/85 sm:text-[14.5px]">
            We use a small set of cookies to keep the site running and to
            understand which parts of the reading land. Your responses are
            confidential and will never be shared with third parties. They may
            be reviewed by the AI Merge team to personalize your experience and
            ensure the right support reaches you.{" "}
            <Link
              href="/privacy"
              className="font-serif-italic underline-offset-4 hover:underline"
            >
              Read the privacy notes
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => dismiss("rejected")}
            className="s-btn-ghost justify-center text-[0.7rem]"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => dismiss("accepted")}
            className="s-btn justify-center text-[0.7rem]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
