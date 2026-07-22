"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useChallenge } from "@/context/challenge-context"
import { VERTICALS, VERTICAL_LABELS, type Vertical } from "@/lib/verticals"

/**
 * Localhost-only vertical switcher for QA. Renders a small fixed pill bar
 * on every /challenge/* page when the site is served from localhost -
 * never in any deployed environment (gated on hostname at runtime, so it
 * also works when testing a local production build via `npm run start`).
 *
 * Switching:
 *  - On the entry page: re-navigates with ?vertical=<id>, exercising the
 *    real server-side resolution path a landing-page link would take.
 *  - Mid-funnel (/challenge/<vertical>/...): updates the session's
 *    audience and jumps to the SAME step under the new vertical, so
 *    per-vertical question/beat copy can be compared in place without
 *    re-entering the funnel.
 */
export function VerticalDevSwitcher() {
  const pathname = usePathname()
  const router = useRouter()
  const { state, setAudience } = useChallenge()

  // Hostname gate, resolved after mount (SSR renders nothing).
  const [isLocal, setIsLocal] = useState(false)
  useEffect(() => {
    const h = window.location.hostname
    setIsLocal(h === "localhost" || h === "127.0.0.1" || h === "[::1]")
  }, [])

  // Collapsed by default so it never covers real UI during screenshots.
  const [open, setOpen] = useState(false)

  if (!isLocal || !pathname) return null

  const segMatch = pathname.match(/^\/challenge\/([^/]+)(\/.*)?$/)
  const seg = segMatch?.[1]
  const onEntry = seg === "audience"
  const inFunnel = !!seg && (VERTICALS as readonly string[]).includes(seg)

  // Only meaningful on the entry page and inside the funnel steps.
  if (!onEntry && !inFunnel) return null

  const current: Vertical = inFunnel
    ? (seg as Vertical)
    : (() => {
        const p = new URLSearchParams(window.location.search)
        const fromUrl = p.get("vertical") ?? p.get("lp") ?? p.get("v")
        return (VERTICALS as readonly string[]).includes(fromUrl ?? "")
          ? (fromUrl as Vertical)
          : (state.audience ?? "main")
      })()

  const switchTo = (v: Vertical) => {
    if (v === current) return
    if (onEntry) {
      router.push(`/challenge/audience?vertical=${v}`)
      return
    }
    // Mid-funnel: keep the step, swap the track. Audience is updated first
    // so the funnel guard's cross-audience check doesn't snap back.
    setAudience(v)
    router.push(`/challenge/${v}${segMatch?.[2] ?? "/question-1"}`)
  }

  return (
    <div className="fixed bottom-3 left-3 z-[90] font-sans print:hidden">
      {open ? (
        <div className="flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-50/95 py-1 pl-3 pr-1 shadow-lg backdrop-blur dark:bg-amber-950/90">
          <span className="mr-1 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
            dev · vertical
          </span>
          {VERTICALS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => switchTo(v)}
              className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                v === current
                  ? "bg-amber-600 text-white"
                  : "text-amber-800 hover:bg-amber-200/70 dark:text-amber-200 dark:hover:bg-amber-800/60"
              }`}
            >
              {VERTICAL_LABELS[v]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Collapse vertical switcher"
            className="ml-0.5 rounded-full px-2 py-1 text-[10px] text-amber-700 hover:bg-amber-200/70 dark:text-amber-300 dark:hover:bg-amber-800/60"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`Vertical: ${VERTICAL_LABELS[current]} (dev switcher)`}
          className="rounded-full border border-amber-400/60 bg-amber-50/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 shadow-lg backdrop-blur hover:bg-amber-100 dark:bg-amber-950/90 dark:text-amber-300"
        >
          {VERTICAL_LABELS[current]}
        </button>
      )}
    </div>
  )
}
