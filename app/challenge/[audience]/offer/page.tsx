"use client"

import { use } from "react"
import { OfferScreen } from "@/components/challenge/offer-screen"
import { B2BOfferScreen } from "@/components/challenge/b2b-offer-screen"
import type { Audience } from "@/context/challenge-context"
import { displayFor } from "@/lib/vertical-display"

export default function OfferPage({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)
  // B2B verticals (healthcare) sell the $197 Action Plan on a structurally
  // different page; every B2C vertical shares the $47 offer.
  return displayFor(audience).offerVariant === "b2b" ? (
    <B2BOfferScreen audience={audience} />
  ) : (
    <OfferScreen audience={audience} />
  )
}
