"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
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

// The report is now a paid deliverable (included with every tier starting
// at $47). Frontend gate only — backend should re-verify the session on
// any sensitive operation. The unlock signal is ?paid=1 in the URL, which
// matches the existing Stripe success redirect format.
function ReportRouter() {
  const searchParams = useSearchParams()
  const isPaid = searchParams.get("paid") === "1"
  return isPaid ? <ClarityReport /> : <ReportPaywall />
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
