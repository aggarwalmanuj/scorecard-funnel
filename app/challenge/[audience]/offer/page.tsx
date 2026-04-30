"use client"

import { use } from "react"
import { OfferScreen } from "@/components/challenge/offer-screen"
import type { Audience } from "@/context/challenge-context"

export default function OfferPage({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)
  return <OfferScreen audience={audience} />
}
