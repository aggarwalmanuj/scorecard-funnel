import type { Metadata } from "next"
import { ClarityReportShell } from "./shell"

export const metadata: Metadata = {
  title: "Your Clarity Readiness Report",
  description:
    "A printable, personalized report of what surfaced during your Honest Decision Challenge.",
  robots: { index: false, follow: false },
}

export default function ReportPage() {
  return <ClarityReportShell />
}
