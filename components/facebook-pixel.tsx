"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import {
  FB_PIXEL_ID,
  ROUTE_EVENT_MAP,
  pageview,
  trackCustom,
} from "@/lib/fbpixel"

function fireRouteEvents(pathname: string | null) {
  pageview()
  const eventName = pathname ? ROUTE_EVENT_MAP[pathname] : undefined
  if (eventName) trackCustom(eventName, { path: pathname })
}

function whenFbqReady(cb: () => void, attempts = 20) {
  if (typeof window === "undefined") return
  if (window.fbq) {
    cb()
    return
  }
  if (attempts <= 0) return
  setTimeout(() => whenFbqReady(cb, attempts - 1), 150)
}

export default function FacebookPixelTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirstLoad = useRef(true)

  useEffect(() => {
    if (!FB_PIXEL_ID) return

    if (isFirstLoad.current) {
      isFirstLoad.current = false
      whenFbqReady(() => {
        const eventName = pathname ? ROUTE_EVENT_MAP[pathname] : undefined
        if (eventName) trackCustom(eventName, { path: pathname })
      })
      return
    }

    fireRouteEvents(pathname)
  }, [pathname, searchParams])

  return null
}
