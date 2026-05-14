"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

// Dev-only floating panel for quick testing of the paywall + checkout
// flows. Renders only when:
//   - NODE_ENV !== "production", OR
//   - the URL carries ?dev=1 (manual override for preview deploys)
// Visibility persists across navigations once toggled. Hidden in
// production builds unless the override is explicit.

const STORAGE_KEY = "ufa-dev-tools-open"

interface Shortcut {
  label: string
  hint?: string
  href: string
}

const SHORTCUTS: Shortcut[] = [
  { label: "Landing", href: "/" },
  { label: "Audience picker", href: "/challenge/audience" },
  {
    label: "Summary (individual)",
    hint: "Glass panel",
    href: "/challenge/individual/summary",
  },
  {
    label: "Offer (individual)",
    hint: "3 tiers + upsells",
    href: "/challenge/individual/offer",
  },
  {
    label: "Report — locked",
    hint: "Paywall view",
    href: "/challenge/report",
  },
  {
    label: "Report — unlocked",
    hint: "?paid=1",
    href: "/challenge/report?paid=1",
  },
  {
    label: "Thank-you (paid)",
    hint: "Stripe success state",
    href: "/challenge/thank-you?paid=1&audience=individual",
  },
]

export function DevTools() {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Hydrate the open/closed pref + visibility flag once we're on the
  // client. The visibility flag intentionally re-evaluates on every
  // mount so toggling ?dev=1 doesn't require a full reload of state.
  useEffect(() => {
    const isDev = process.env.NODE_ENV !== "production"
    const override =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("dev") === "1"
    setEnabled(isDev || override)

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === "1") setOpen(true)
    } catch {
      /* localStorage may be blocked — silently ignore */
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    try {
      window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [open, enabled])

  if (!enabled) return null

  const isPaid = searchParams.get("paid") === "1"

  const togglePaid = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (isPaid) params.delete("paid")
    else params.set("paid", "1")
    const next = params.toString()
    router.push(next ? `${pathname}?${next}` : pathname)
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] font-sans"
      style={{ pointerEvents: "auto" }}
    >
      {open ? (
        <div
          className="w-[280px] rounded-md p-4 shadow-2xl"
          style={{
            background: "rgba(10, 10, 14, 0.92)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "rgba(255, 255, 255, 0.92)",
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "#7cf6a8" }}
                aria-hidden
              />
              <span
                className="text-[10px] uppercase tracking-[0.22em]"
                style={{ color: "rgba(255, 255, 255, 0.65)" }}
              >
                Dev tools
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close dev tools"
              className="text-[14px] leading-none transition-opacity hover:opacity-100"
              style={{ color: "rgba(255, 255, 255, 0.5)" }}
            >
              ×
            </button>
          </div>

          <button
            type="button"
            onClick={togglePaid}
            className="mb-4 flex w-full items-center justify-between rounded-sm px-3 py-2.5 text-left text-[12px] transition-colors"
            style={{
              background: isPaid
                ? "rgba(124, 246, 168, 0.18)"
                : "rgba(255, 255, 255, 0.06)",
              border: isPaid
                ? "1px solid rgba(124, 246, 168, 0.4)"
                : "1px solid rgba(255, 255, 255, 0.1)",
              color: isPaid ? "#7cf6a8" : "rgba(255, 255, 255, 0.85)",
            }}
          >
            <span>
              <span className="block font-medium">
                {isPaid ? "Paid (?paid=1)" : "Unpaid"}
              </span>
              <span
                className="block text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: isPaid
                    ? "rgba(124, 246, 168, 0.7)"
                    : "rgba(255, 255, 255, 0.45)",
                }}
              >
                Tap to toggle
              </span>
            </span>
            <span
              className="inline-block h-4 w-7 rounded-full p-0.5 transition-colors"
              style={{
                background: isPaid
                  ? "#7cf6a8"
                  : "rgba(255, 255, 255, 0.15)",
              }}
              aria-hidden
            >
              <span
                className="block h-3 w-3 rounded-full transition-transform"
                style={{
                  background: isPaid
                    ? "rgba(10, 10, 14, 0.9)"
                    : "rgba(255, 255, 255, 0.5)",
                  transform: isPaid ? "translateX(12px)" : "translateX(0)",
                }}
              />
            </span>
          </button>

          <div
            className="mb-2 text-[10px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(255, 255, 255, 0.5)" }}
          >
            Jump to
          </div>
          <ul className="space-y-1">
            {SHORTCUTS.map((s) => {
              const active = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "") === s.href
              return (
                <li key={s.href}>
                  <button
                    type="button"
                    onClick={() => router.push(s.href)}
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors"
                    style={{
                      background: active
                        ? "rgba(255, 255, 255, 0.08)"
                        : "transparent",
                      color: "rgba(255, 255, 255, 0.85)",
                    }}
                  >
                    <span>{s.label}</span>
                    {s.hint && (
                      <span
                        className="ml-2 text-[10px] uppercase tracking-[0.16em]"
                        style={{ color: "rgba(255, 255, 255, 0.4)" }}
                      >
                        {s.hint}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          <div
            className="mt-3 border-t pt-3 text-[10px] leading-[1.5]"
            style={{
              borderColor: "rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.4)",
            }}
          >
            Visible in dev. Append <code>?dev=1</code> to any URL to force-enable in preview.
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open dev tools"
          className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[10px] uppercase tracking-[0.22em] shadow-2xl transition-transform hover:scale-[1.03]"
          style={{
            background: "rgba(10, 10, 14, 0.92)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "rgba(255, 255, 255, 0.85)",
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "#7cf6a8" }}
            aria-hidden
          />
          Dev
        </button>
      )}
    </div>
  )
}
