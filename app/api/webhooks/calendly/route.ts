import { NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { isCosmosConfigured, recordPurchase } from "@/lib/server/cosmos-db"
import { sendPurchaseEvent } from "@/lib/server/meta-capi"
import { redactError } from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// The deeper tiers ($497 Hear Your Story, $1,997 Believe Yourself, $4,997
// Build From That Belief) are booked + paid inside Calendly's hosted flow,
// when their per-tier URL is configured. Calendly POSTs an `invitee.created` event here when a
// booking completes; we use it to:
//   1. fire a server-side Meta Purchase (backstop for the browser pixel, which
//      only fires if Calendly redirects the user back to /challenge/thank-you), and
//   2. record the purchase against the user row for /techadmin analytics.
//
// Attribution is carried through Calendly's UTM passthrough, which it surfaces
// in the webhook payload's `tracking` object (see openCalendly in
// components/challenge/offer-screen.tsx):
//   tracking.utm_medium  → tier ("session" | "transformation" | "elevated")
//   tracking.utm_content → serialNumber (links the booking to the funnel row)
//
// Required env:
//   CALENDLY_WEBHOOK_SIGNING_KEY  Signing key from the webhook subscription
//                                 (Calendly → Integrations → Webhooks). If unset,
//                                 events are accepted unsigned (dev only).

const TIER_VALUE: Record<string, number> = {
  session: 497,
  transformation: 1997,
  elevated: 4997,
}

/**
 * Verify Calendly's `Calendly-Webhook-Signature: t=<ts>,v1=<hex>` header.
 * v1 = HMAC-SHA256(signingKey, `${t}.${rawBody}`).
 */
function verifySignature(
  rawBody: string,
  header: string | null,
  key: string,
): boolean {
  if (!header) return false
  const parts: Record<string, string> = {}
  for (const segment of header.split(",")) {
    const idx = segment.indexOf("=")
    if (idx === -1) continue
    parts[segment.slice(0, idx).trim()] = segment.slice(idx + 1).trim()
  }
  const t = parts.t
  const v1 = parts.v1
  if (!t || !v1) return false
  const expected = createHmac("sha256", key).update(`${t}.${rawBody}`).digest("hex")
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(v1)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY
  const sigHeader = req.headers.get("calendly-webhook-signature")

  if (signingKey) {
    if (!verifySignature(rawBody, sigHeader, signingKey)) {
      console.error("[calendly/webhook] signature verification failed")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
  } else {
    // Mirrors the Stripe webhook's dev fallback: accept unsigned locally so
    // the integration can be exercised before the signing key is wired up.
    console.warn(
      "[calendly/webhook] CALENDLY_WEBHOOK_SIGNING_KEY not set — accepting event without signature verification",
    )
  }

  let evt: {
    event?: string
    payload?: {
      email?: string
      name?: string
      uri?: string
      tracking?: Record<string, unknown>
      payment?: { amount?: number; currency?: string } | null
    }
  }
  try {
    evt = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (evt.event !== "invitee.created") {
    console.info("[calendly/webhook] event ignored", { type: evt.event })
    return NextResponse.json({ received: true, ignored: evt.event ?? "unknown" })
  }

  const p = evt.payload ?? {}
  const email = typeof p.email === "string" ? p.email : ""
  const fullName = typeof p.name === "string" ? p.name : ""
  const firstName = fullName.trim().split(/\s+/)[0] ?? ""

  const tracking = p.tracking ?? {}
  const utmMedium =
    typeof tracking.utm_medium === "string" ? tracking.utm_medium : ""
  const tier =
    utmMedium === "session" || utmMedium === "transformation" ? utmMedium : ""

  // The invitee uuid is the last path segment of the invitee URI. Calendly also
  // appends it to the post-booking redirect as `invitee_uuid`, so the browser
  // pixel and this server event share the same id and Meta dedupes them.
  const inviteeUuid =
    typeof p.uri === "string" ? (p.uri.split("/").filter(Boolean).pop() ?? "") : ""

  // Prefer the actual amount Calendly collected; fall back to the tier price.
  let value = tier ? TIER_VALUE[tier] : 0
  if (typeof p.payment?.amount === "number" && p.payment.amount > 0) {
    value = p.payment.amount
  }
  const currency =
    typeof p.payment?.currency === "string" ? p.payment.currency : "USD"

  console.info("[calendly/webhook] invitee.created", {
    email,
    tier,
    inviteeUuid,
    value,
    paid: Boolean(p.payment),
  })

  // Server-side Meta Purchase (no-ops if CAPI isn't configured).
  if (inviteeUuid && value > 0) {
    await sendPurchaseEvent({
      eventId: inviteeUuid,
      email,
      value,
      currency,
      contentName: tier ? `unfair-advantage-${tier}` : undefined,
    })
  }

  // Record the purchase for /techadmin analytics. Best-effort — never fail the
  // webhook (Calendly would retry) on an analytics write hiccup.
  const sno = Number.parseInt(
    typeof tracking.utm_content === "string" ? tracking.utm_content : "",
    10,
  )
  if (isCosmosConfigured() && Number.isInteger(sno) && sno > 0 && tier) {
    try {
      await recordPurchase(sno, firstName, email, {
        paid_tier: tier,
        paid_amount: String(value),
      })
    } catch (e) {
      console.error("[calendly/webhook] recordPurchase failed", redactError(e))
    }
  }

  return NextResponse.json({ received: true })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST Calendly invitee.created webhooks here. Subscribe at Calendly → Integrations → Webhooks (scope: invitee.created).",
  })
}
