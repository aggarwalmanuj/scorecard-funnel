"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useChallenge, type Audience } from "@/context/challenge-context"
import { isFunnelEnforced, resolveFunnelRedirect } from "@/lib/funnel-guard"

/**
 * Sequence enforcer for /challenge/[audience]/* pages.
 *
 * - When NEXT_PUBLIC_ENFORCE_FUNNEL_ORDER !== "true" (dev / test), this is
 *   a transparent passthrough and adds no runtime overhead beyond a single
 *   ref check.
 * - When enforcement is on, the guard waits for the challenge context to
 *   hydrate from localStorage, then checks the current path against the
 *   user's state. A missing prerequisite triggers `router.replace()` to
 *   the earliest unsatisfied step. Children are not rendered while the
 *   check is in flight or a redirect is pending — this is what prevents
 *   the flash of restricted content on direct URL access.
 *
 * The guard runs on every pathname change so that client-side soft
 * navigations (router.push) inside the funnel are re-validated too.
 */
export function FunnelGuard({
  audience,
  children,
}: {
  audience: Audience
  children: ReactNode
}) {
  const enforced = isFunnelEnforced()
  const router = useRouter()
  const pathname = usePathname()
  const { state, isHydrated } = useChallenge()
  const [cleared, setCleared] = useState(!enforced)
  // Suppress repeated router.replace calls for the same target while a
  // navigation is in flight — without this React's strict-mode double-
  // invoke and the post-replace re-render would queue duplicate pushes.
  const pendingRedirectRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enforced) return
    if (!isHydrated) return

    const target = resolveFunnelRedirect({ pathname: pathname ?? "", audience, state })
    if (target && target !== pathname) {
      if (pendingRedirectRef.current === target) return
      pendingRedirectRef.current = target
      setCleared(false)
      router.replace(target)
      return
    }
    pendingRedirectRef.current = null
    setCleared(true)
  }, [enforced, isHydrated, pathname, audience, state, router])

  if (!cleared) return null
  return <>{children}</>
}
