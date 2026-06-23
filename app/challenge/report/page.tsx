import type { Metadata } from "next"
import { ClarityReportShell } from "./shell"

export const metadata: Metadata = {
  title: "Your Belief Score Report",
  description:
    "A printable, personalized report of what surfaced during your Belief Score assessment.",
  robots: { index: false, follow: false },
}

export default function ReportPage() {
  return <ClarityReportShell />
}
