"use client"

import dynamic from "next/dynamic"

// jspdf's "node" entrypoint pulls fflate's Worker dynamic-import path, which
// Turbopack cannot resolve during the SSR pass. Loading ClarityReport with
// ssr:false skips that pass entirely — the report is a print/download tool
// and only ever needs to run in the browser anyway.
const ClarityReport = dynamic(
  () =>
    import("@/components/challenge/clarity-report").then((m) => ({
      default: m.ClarityReport,
    })),
  { ssr: false }
)

/**
 * The report renders inside `data-palette="marine"` so its scoped tokens
 * line up with the rest of the challenge funnel. The report's internal
 * CSS already supplies its own --ink/--brand variables (mapped to the
 * Marine teal family), but wrapping here keeps the chrome (focus rings,
 * ::selection) consistent if the report ever pulls in editorial utilities.
 */
export function ClarityReportShell() {
  return (
    <div data-palette="marine" className="bg-background text-foreground font-sans">
      <ClarityReport />
    </div>
  )
}
