import { NextResponse } from "next/server"
import { z } from "zod"
import { getStripe } from "@/lib/stripe"
import { redactError } from "@/lib/security"
import { isPreviewSecret } from "@/lib/server/admin-auth"

/**
 * POST /api/stripe/verify-session
 *
 * Server-side proof of payment for the $47 Diagnostic report. The report page
 * used to unlock on a bare `?paid=1` query param — trivially forgeable, which
 * let anyone who finished the (free) assessment download the paid report. This
 * route instead retrieves the actual Stripe Checkout Session and confirms it
 * was paid, so the unlock can't be faked from the client.
 *
 * Returns { ok, paid, tier }. `paid` is only true when Stripe itself reports
 * the session as paid. Invalid / unknown ids resolve to paid:false (never an
 * error the client could treat as a pass).
 *
 * Note: the $497 / $1,997 / $4,997 tiers are paid inside Calendly's hosted flow and have
 * no Stripe session here — those are handled separately on the report page.
 *
 * Preview bypass: a `previewSecret` matching the admin/tech password unlocks
 * (paid:true, tier:"preview") WITHOUT a Stripe call, so we can review the paid
 * report layout without paying. The check is server-side and constant-time —
 * a regular customer can't forge it because they don't hold the secret.
 */

const Body = z.object({
  sessionId: z.string().trim().min(1).max(120).optional(),
  previewSecret: z.string().trim().min(1).max(200).optional(),
})

// Stripe Checkout Session ids are `cs_test_…` / `cs_live_…`. Reject anything
// else before spending a Stripe API call (and to avoid leaking lookups).
const SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]+$/

export async function POST(req: Request) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ ok: false, paid: false, error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, paid: false, error: "Invalid input" }, { status: 400 })
  }
  const { sessionId, previewSecret } = parsed.data

  // Preview bypass (review-only): a valid admin/tech secret unlocks the report
  // layout without a Stripe session. Checked first, server-side, constant-time.
  if (isPreviewSecret(previewSecret)) {
    return NextResponse.json({ ok: true, paid: true, tier: "preview" })
  }

  // Past this point a Stripe session id is required (nothing else unlocks).
  if (!sessionId || !SESSION_ID_RE.test(sessionId)) {
    return NextResponse.json({ ok: true, paid: false })
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    const paid = session.payment_status === "paid"
    return NextResponse.json({
      ok: true,
      paid,
      tier: typeof session.metadata?.tier === "string" ? session.metadata.tier : null,
    })
  } catch (e) {
    console.error("[stripe/verify-session]", redactError(e))
    return NextResponse.json({ ok: false, paid: false, error: "Verification failed" }, { status: 502 })
  }
}
