import { identifyClarity } from "@/lib/clarity"

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
    })
    if (!res.ok) {
      console.warn("[submitSignup] request failed with status", res.status)
      return null
    }
    const json = await res.json()
    const serialNumber =
      typeof json.serialNumber === "number" ? json.serialNumber : null

    // Tag the Clarity session with the user's email + first name so the
    // recordings panel can be filtered by lead. Fire-and-forget — never
    // block the navigation to the next funnel step on this. Every signup
    // call site (hero form, audience page, CTA banner) now identifies for
    // free without per-component wiring.
    void identifyClarity(email, firstName)

    return serialNumber
  } catch {
    console.warn("[submitSignup] network error")
    return null
  }
}

/**
 * Sends an answer, feedback, or beat output to `/api/sheets/append`.
 * Retries once on failure. Returns true if saved successfully, false otherwise.
 */
export async function submitToGoogleSheet(
  payload: AnswerPayload | FeedbackPayload | BeatOutputPayload,
  maxRetries = 2
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch("/api/sheets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) return true
      console.warn(`[submitToGoogleSheet] attempt ${attempt + 1} failed with status`, res.status)
    } catch {
      console.warn(`[submitToGoogleSheet] attempt ${attempt + 1} network error`)
    }
    // Brief delay before retry
    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  console.error("[submitToGoogleSheet] all retries exhausted for", payload.action, "beatNumber" in payload ? `beat ${payload.beatNumber}` : "")
  return false
}
