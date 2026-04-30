"use client"

import { use } from "react"
import { JourneySummaryScreen } from "@/components/challenge/journey-summary-screen"
import type { Audience } from "@/context/challenge-context"

export default function SummaryPage({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)
  return <JourneySummaryScreen audience={audience} />
}
