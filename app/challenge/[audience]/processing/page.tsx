"use client"

import { use } from "react"
import { ProcessingScreen } from "@/components/challenge/processing-screen"
import type { Audience } from "@/context/challenge-context"

export default function ProcessingPage({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)
  return <ProcessingScreen audience={audience} />
}
