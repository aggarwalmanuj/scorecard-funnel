"use client"

import dynamic from "next/dynamic"

// jspdf's "node" entrypoint pulls fflate's Worker dynamic-import path, which
// Turbopack cannot resolve during the SSR pass.  Loading ClarityReport with
// ssr:false skips that pass entirely — the report is a print/download tool
// and only ever needs to run in the browser anyway.
const ClarityReport = dynamic(
  () =>
    import("@/components/challenge/clarity-report").then((m) => ({
      default: m.ClarityReport,
    })),
  { ssr: false }
)

export function ClarityReportShell() {
  return <ClarityReport />
}
