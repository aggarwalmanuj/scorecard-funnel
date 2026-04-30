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
