export type Audience = "individual" | "team"

type SignupPayload = {
  action: "signup"
  firstName: string
  email: string
  audience?: Audience
}

type AnswerPayload = {
  action: "answer"
  firstName: string
  email: string
  audience?: Audience
  serialNumber: number
  questionNumber: number
  answer: string
  /**
   * The exact question copy shown to the user when they answered. Optional so
   * older callers keep working, but always pass it from QuestionScreen so the
   * stored answer remains interpretable after admin edits.
   */
  questionText?: string
}

type FeedbackPayload = {
  action: "feedback"
  firstName: string
  email: string
  audience?: Audience
  serialNumber: number
  beatNumber: number
  feedback: string
}

type BeatOutputPayload = {
  action: "beat_output"
  firstName: string
  email: string
  audience?: Audience
  serialNumber: number
  beatNumber: number
  output: string
}

type SheetPayload = SignupPayload | AnswerPayload | FeedbackPayload | BeatOutputPayload

/**
 * Submits a signup to Google Sheets and returns the assigned serial number.
 * Each signup ALWAYS creates a new row, even for repeat emails.
 * Returns null if the request failed (UI should still proceed).
 */
export async function submitSignup(
  firstName: string,
  email: string,
  audience?: Audience
): Promise<number | null> {
  try {
    const res = await fetch("/api/sheets/append", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "signup", firstName, email, audience }),
      keepalive: true,
    })
    if (!res.ok) {
      console.warn("[submitSignup] request failed with status", res.status)
      return null
    }
    const json = await res.json()
    const serialNumber =
      typeof json.serialNumber === "number" ? json.serialNumber : null

    return serialNumber
  } catch {
    console.warn("[submitSignup] network error")
    return null
  }
}

/**
 * Sends an answer, feedback, or beat output to `/api/sheets/append`.
 *
 * Reliability notes (these matter — testers reported lost writes):
 *  • `keepalive: true` lets the request finish even if the user navigates
 *    or closes the tab mid-flight. Crucial here: the feedback button
 *    submits-then-navigates within ~1.2s, and without keepalive a slow
 *    network can cancel the request the moment Next.js starts the route
 *    transition. Body must stay under the browser's 64 KB keepalive cap —
 *    beat outputs are clamped server-side to 50,000 chars, so we're safe.
 *  • Three attempts with exponential backoff (700ms, 1500ms). The server
 *    patch is idempotent (a re-sent SET overwrites with the same value),
 *    so duplicate writes from retry-on-perceived-failure are harmless.
 *  • Callers MUST `await` this in code paths that navigate immediately
 *    after — see beat-reveal-screen.tsx and processing-screen.tsx.
 */
export async function submitToGoogleSheet(
  payload: AnswerPayload | FeedbackPayload | BeatOutputPayload,
  maxRetries = 3
): Promise<boolean> {
  const backoffMs = [700, 1500] as const
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch("/api/sheets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
      if (res.ok) return true
      // 4xx is a permanent failure (bad payload, missing field) — no point
      // retrying, the server will reject every attempt the same way.
      if (res.status >= 400 && res.status < 500) {
        console.error(`[submitToGoogleSheet] permanent ${res.status} for`, payload.action)
        return false
      }
      console.warn(`[submitToGoogleSheet] attempt ${attempt + 1} failed with status`, res.status)
    } catch {
      console.warn(`[submitToGoogleSheet] attempt ${attempt + 1} network error`)
    }
    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, backoffMs[attempt] ?? 1500))
    }
  }
  console.error(
    "[submitToGoogleSheet] all retries exhausted for",
    payload.action,
    "beatNumber" in payload ? `beat ${payload.beatNumber}` : "",
  )
  return false
}
