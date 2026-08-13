import { getAttribution } from "@/lib/client/attribution"
import type { Vertical } from "@/lib/verticals"

export type Audience = Vertical

type SignupPayload = {
  action: "signup"
  firstName: string
  email: string
  phone?: string
  /** Shared id so the server Lead CAPI event dedups against the browser pixel. */
  leadEventId?: string
  audience?: Audience
  attribution?: ReturnType<typeof getAttribution>
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
 * Returns null only if every attempt failed (UI should still proceed).
 *
 * The serial number is the key EVERY later write is addressed by - answers,
 * beat outputs, feedback, score, summary all refuse to send without it. One
 * failed request here therefore does not cost one row, it costs the entire
 * participant: they complete the assessment, see their result, and nothing
 * after the signup is ever recorded. That made a single transient 5xx or a
 * flaky first connection silently equivalent to losing the respondent.
 *
 * Retrying is safe because signup is idempotent for an unfinished session:
 * the server reuses an existing INCOMPLETE row for the same email and returns
 * its serial (see reuse rules in lib/server/cosmos-db.ts), so a second attempt
 * cannot mint a duplicate row. A row that already carries answers is never
 * reused, so a genuine retake still gets its own serial.
 */
const SIGNUP_BACKOFF_MS = [400, 1200]

export async function submitSignup(
  firstName: string,
  email: string,
  audience?: Audience,
  phone?: string,
  leadEventId?: string
): Promise<number | null> {
  // First-touch attribution (utm_* / referrer) captured at the landing.
  // Scoped to THIS signup's vertical - otherwise a browser that once saw
  // another vertical's doorway credits this lead to that campaign.
  const attribution = getAttribution(audience)
  const body = JSON.stringify({
    action: "signup",
    firstName,
    email,
    audience,
    ...(phone ? { phone } : {}),
    ...(leadEventId ? { leadEventId } : {}),
    ...(Object.keys(attribution).length > 0 ? { attribution } : {}),
  })

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("/api/sheets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      })
      if (res.ok) {
        const json = await res.json()
        if (typeof json.serialNumber === "number") return json.serialNumber
        // A 200 that carries no serial used to return null in silence, which
        // is the hardest version of this failure to notice afterwards: the
        // request looks successful in the network panel and the row never
        // appears. Say so, then retry like any other failure.
        console.warn(
          `[submitSignup] attempt ${attempt + 1} returned 200 with no serialNumber`,
        )
      } else {
        console.warn(
          `[submitSignup] attempt ${attempt + 1} failed with status`,
          res.status,
        )
      }
    } catch {
      console.warn(`[submitSignup] attempt ${attempt + 1} threw (network)`)
    }
    if (attempt < SIGNUP_BACKOFF_MS.length) {
      await new Promise((r) => setTimeout(r, SIGNUP_BACKOFF_MS[attempt]))
    }
  }

  console.error(
    "[submitSignup] no serial number after 3 attempts - this session's answers, beats, feedback, score and summary will NOT be recorded",
  )
  return null
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
