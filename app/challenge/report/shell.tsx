"use client"

import dynamic from "next/dynamic"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ReportPaywall } from "@/components/challenge/report-paywall"

// jspdf's "node" entrypoint pulls fflate's Worker dynamic-import path, which
// Turbopack cannot resolve during the SSR pass. Loading ClarityReport with
// ssr:false skips that pass entirely - the report is a print/download tool
// and only ever needs to run in the browser anyway.
const ClarityReport = dynamic(
  () =>
    import("@/components/challenge/clarity-report").then((m) => ({
      default: m.ClarityReport,
    })),
  { ssr: false }
)

type Access = "checking" | "allowed" | "denied"

/**
 * Gate for the paid report. The report is a paid deliverable (every tier from
 * $47 up). Access is decided as follows:
 *
 *  - Stripe ($47 Diagnostic): the success redirect carries `session_id`. We
 *    verify it SERVER-SIDE (/api/stripe/verify-session) - a forged `?paid=1`
 *    no longer unlocks anything, because only a genuinely paid Stripe session
 *    returns paid:true.
 *  - Calendly ($497 / $1,997 / $4,997): paid inside Calendly's hosted flow, so there's no
 *    Stripe session to verify here. We allow these tiers through (the report
 *    is personalized to the viewer's own assessment). Tightening this to a
 *    true payment check requires a Calendly webhook that records paid status
 *    server-side - tracked separately.
 */
function ReportRouter() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const tier = searchParams.get("tier")
  // Review-only preview: `?preview` shows a password gate. The password is
  // verified SERVER-SIDE (verify-session's previewSecret branch), so a customer
  // who guesses the URL just sees a locked prompt they can't pass. It unlocks
  // the same layout with whatever real report data is in the viewer's session.
  const previewMode = searchParams.has("preview")
  const [access, setAccess] = useState<Access>(previewMode ? "denied" : "checking")
  const [previewPassword, setPreviewPassword] = useState("")
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewChecking, setPreviewChecking] = useState(false)

  useEffect(() => {
    // In preview mode we wait for the admin to submit the password (below)
    // rather than running the Stripe/tier checks.
    if (previewMode) return

    let cancelled = false

    // Calendly-booked tiers: no Stripe session to verify (see note above).
    if (tier === "session" || tier === "transformation") {
      setAccess("allowed")
      return
    }

    // Stripe path: a verifiable session id is the ONLY thing that unlocks.
    if (!sessionId) {
      setAccess("denied")
      return
    }

    setAccess("checking")
    fetch("/api/stripe/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((d: { paid?: boolean }) => {
        if (!cancelled) setAccess(d?.paid ? "allowed" : "denied")
      })
      .catch(() => {
        if (!cancelled) setAccess("denied")
      })

    return () => {
      cancelled = true
    }
  }, [sessionId, tier, previewMode])

  async function submitPreview(e: React.FormEvent) {
    e.preventDefault()
    if (previewChecking) return
    setPreviewChecking(true)
    setPreviewError(null)
    try {
      const r = await fetch("/api/stripe/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewSecret: previewPassword }),
      })
      const d: { paid?: boolean } = await r.json()
      if (d?.paid) {
        setAccess("allowed")
      } else {
        setPreviewError("Incorrect password.")
      }
    } catch {
      setPreviewError("Could not verify. Try again.")
    } finally {
      setPreviewChecking(false)
    }
  }

  if (access === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="flex items-center gap-3 text-foreground/70">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.6} />
          <span className="text-sm">Confirming your purchase…</span>
        </div>
      </div>
    )
  }

  if (access === "allowed") return <ClarityReport preview={previewMode} />

  // Preview password gate — only shown on `?preview` and only while still
  // locked. Any other denied access falls through to the normal paywall.
  if (previewMode) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <form
          onSubmit={submitPreview}
          className="w-full max-w-sm rounded-lg border border-border bg-card p-7 text-center"
        >
          <p className="font-serif text-[20px] leading-snug text-ink">
            Report preview
          </p>
          <p className="mx-auto mt-2 max-w-xs text-[13.5px] leading-[1.7] text-foreground/70">
            Enter the admin password to preview the report layout.
          </p>
          <input
            type="password"
            value={previewPassword}
            onChange={(e) => setPreviewPassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
            className="mt-5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
            aria-invalid={!!previewError}
          />
          {previewError && (
            <p role="alert" className="mt-2 text-[12.5px] text-destructive">
              {previewError}
            </p>
          )}
          <button
            type="submit"
            disabled={previewChecking || !previewPassword.trim()}
            className="mt-5 w-full rounded-full bg-ink px-5 py-2.5 text-[12px] font-medium uppercase tracking-[0.2em] text-background transition-opacity disabled:opacity-50"
          >
            {previewChecking ? "Checking…" : "Unlock preview"}
          </button>
        </form>
      </div>
    )
  }

  return <ReportPaywall />
}

export function ClarityReportShell() {
  return (
    <div data-palette="marine" className="bg-background text-foreground font-sans">
      <Suspense fallback={null}>
        <ReportRouter />
      </Suspense>
    </div>
  )
}
