"use client"

import { useEffect } from "react"
import posthog from "posthog-js"
import type { HeadlineVariant } from "@/lib/headline-shared"

/**
 * Mirrors the server-made headline assignment into the client's world:
 *   - localStorage `ufa_headline`, which getHeadlineAttribution() reads to
 *     stamp headline_id/text onto the signup row (powers the admin's
 *     per-variant funnel table), and
 *   - the PostHog `headline_id` super property, so every captured event can
 *     be broken down by variant.
 *
 * Display is NOT this component's job - the variant is already in the SSR
 * HTML (assigned by middleware, rendered by /hl/[id]). Impressions are
 * counted server-side in middleware, once per new assignment.
 */
export function HeadlineSync({ variant }: { variant: HeadlineVariant }) {
  useEffect(() => {
    try {
      window.localStorage.setItem("ufa_headline", JSON.stringify(variant))
    } catch {
      /* quota / privacy mode - attribution simply omits the headline */
    }
    try {
      posthog.register({ headline_id: variant.id })
    } catch {
      /* posthog not initialized (dev without token) */
    }
  }, [variant])

  return null
}
