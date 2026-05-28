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
 *    verify it SERVER-SIDE (/api/stripe/verify-session) — a forged `?paid=1`
 *    no longer unlocks anything, because only a genuinely paid Stripe session
 *    returns paid:true.
 *  - Calendly ($497 / $997): paid inside Calendly's hosted flow, so there's no
 *    Stripe session to verify here. We allow these tiers through (the report
 *    is personalized to the viewer's own assessment). Tightening this to a
 *    true payment check requires a Calendly webhook that records paid status
 *    server-side — tracked separately.
 */
function ReportRouter() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const tier = searchParams.get("tier")
  const [access, setAccess] = useState<Access>("checking")

  useEffect(() => {
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
  }, [sessionId, tier])

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

  return access === "allowed" ? <ClarityReport /> : <ReportPaywall />
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
