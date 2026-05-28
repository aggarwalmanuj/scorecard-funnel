export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID

type PixelData = Record<string, unknown>

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export function pageview() {
  if (typeof window === "undefined" || !window.fbq) return
  window.fbq("track", "PageView")
}

export function track(name: string, data: PixelData = {}) {
  if (typeof window === "undefined" || !window.fbq) return
  window.fbq("track", name, data)
}

/**
 * Fire a standard pixel event, retrying briefly until `fbq` is initialized.
 * The thank-you page is reached via a full-page redirect (Stripe/Calendly),
 * so the base pixel snippet in the <head> has usually run — but the snippet
 * loads `fbevents.js` async, so on a slow connection `fbq` can still be a
 * stub for a moment. This poll guarantees the Purchase event isn't dropped,
 * which is what the ad algorithm optimizes against.
 */
export function trackWhenReady(
  name: string,
  data: PixelData = {},
  attempts = 30,
) {
  if (typeof window === "undefined") return
  if (window.fbq) {
    window.fbq("track", name, data)
    return
  }
  if (attempts <= 0) return
  setTimeout(() => trackWhenReady(name, data, attempts - 1), 150)
}

export function trackCustom(name: string, data: PixelData = {}) {
  if (typeof window === "undefined" || !window.fbq) return
  window.fbq("trackCustom", name, data)
}

export const ROUTE_EVENT_MAP: Record<string, string> = {
  "/": "Landing",
  "/challenge/question-1": "Question 1",
  "/challenge/question-2": "Question 2",
  "/challenge/question-3": "Question 3",
  "/challenge/question-4": "Question 4",
  "/challenge/question-5": "Question 5",
  "/challenge/beat-1": "Beat 1",
  "/challenge/beat-2": "Beat 2",
  "/challenge/beat-3": "Beat 3",
  "/challenge/beat-4": "Beat 4",
  "/challenge/beat-5": "Beat 5",
  "/challenge/processing": "Processing",
  "/challenge/offer": "Offer",
  "/privacy": "Privacy",
  "/terms": "Terms",
}
