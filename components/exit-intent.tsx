"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const SESSION_KEY = "exit-intent-fired"

/**
 * Desktop exit-intent capture. When the cursor leaves through the TOP of the
 * viewport (heading for the tab bar / close / address bar), redirect once per
 * browser session to the standalone offer page so a bounce still sees the
 * $47/$497 offer. Mouse-based, so it's desktop-only by nature — mobile back/
 * close can't be intercepted without hostile history hacks, which we avoid.
 */
export function ExitIntent({ target = "/offer" }: { target?: string }) {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return
    } catch {
      /* sessionStorage blocked - just proceed, the listener is harmless */
    }

    // Grace period so it can't fire the instant the page loads.
    let armed = false
    const armTimer = window.setTimeout(() => {
      armed = true
    }, 4000)

    const cleanup = () => {
      window.clearTimeout(armTimer)
      document.removeEventListener("mouseout", onMouseOut)
    }

    const onMouseOut = (e: MouseEvent) => {
      if (!armed) return
      // Left through the top edge, and actually left the document (no element
      // the cursor moved onto).
      if (e.clientY > 0 || e.relatedTarget) return
      try {
        sessionStorage.setItem(SESSION_KEY, "1")
      } catch {
        /* ignore */
      }
      cleanup()
      router.push(target)
    }

    document.addEventListener("mouseout", onMouseOut)
    return cleanup
  }, [router, target])

  return null
}
