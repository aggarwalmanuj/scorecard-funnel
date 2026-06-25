import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { isCosmosConfigured, recordPurchase } from "@/lib/server/cosmos-db"
import { sendPurchaseEvent } from "@/lib/server/meta-capi"
import { redactError } from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// All four tiers ($47 / $497 / $1,997 / $4,997) are sold through Stripe
// Payment Links (hosted buy.stripe.com pages), so every successful purchase
// fires checkout.session.completed here. The offer page passes the funnel
// serial as the session's client_reference_id; the tier is read from the
// link's metadata if set, otherwise derived from the amount. Events handled:
//
//   checkout.session.completed       → success path
//   checkout.session.expired         → user abandoned (info only)
//   payment_intent.payment_failed    → card declined or 3DS failed
//   charge.refunded                  → refunded after the fact

// Maps the paid amount (in cents) back to a tier id when a Payment Link has no
// tier metadata. Mirrors the prices on the offer screen; keep in sync.
function tierFromAmount(amountTotal: number | null): string {
  switch (amountTotal) {
    case 4700:
      return "diagnostic"
    case 49700:
      return "session"
    case 199700:
      return "transformation"
    case 499700:
      return "elevated"
    default:
      return ""
  }
}

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event
  if (secret && signature) {
    try {
      event = getStripe().webhooks.constructEvent(body, signature, secret)
    } catch (err) {
      console.error("[stripe/webhook] signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
  } else {
    // In production this branch should be unreachable — Stripe
    // sends a signature on every delivery and the secret is set
    // via env. Leaving an unsigned fallback enables local
    // development with `stripe trigger` against a route that
    // hasn't been wired to the CLI's webhook secret yet.
    console.warn(
      "[stripe/webhook] STRIPE_WEBHOOK_SECRET not set — accepting event without signature verification",
    )
    try {
      event = JSON.parse(body) as Stripe.Event
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      console.info("[stripe/webhook] checkout completed", {
        id: session.id,
        email: session.customer_details?.email ?? session.customer_email,
        amountTotal: session.amount_total,
        paymentStatus: session.payment_status,
        tier: session.metadata?.tier,
        productId: session.metadata?.productId,
        audience: session.metadata?.audience,
      })

      const md = session.metadata ?? {}
      // Payment Links surface the funnel serial via client_reference_id (set on
      // the offer page) rather than session metadata; fall back across both.
      // Tier comes from the link's metadata when configured, else the amount.
      const sno = Number.parseInt(
        session.client_reference_id ?? md.serialNumber ?? "",
        10,
      )
      const tier = md.tier || tierFromAmount(session.amount_total)
      const paid = session.payment_status === "paid"
      const email =
        session.customer_details?.email ?? session.customer_email ?? ""

      // Server-side Purchase to the Meta Conversions API — a backstop for the
      // browser pixel (ad-blockers / no-JS). Deduped against the browser event
      // via event_id = the Stripe session id (the thank-you page sends the same
      // id). No-ops if CAPI isn't configured.
      if (paid && session.amount_total != null) {
        await sendPurchaseEvent({
          eventId: session.id,
          email,
          // Stripe collects the phone on the Payment Link page when enabled;
          // hashed server-side for advanced matching.
          phone: session.customer_details?.phone ?? undefined,
          value: session.amount_total / 100,
          contentName: tier ? `unfair-advantage-${tier}` : undefined,
        })
      }

      // Record the purchase against the user row for /techadmin analytics.
      // Authoritative (server-verified) — complements the thank-you client
      // write which also covers Calendly tiers. Best-effort: never fail the
      // webhook (Stripe would retry) on an analytics write hiccup.
      if (
        isCosmosConfigured() &&
        Number.isInteger(sno) &&
        sno > 0 &&
        tier &&
        paid
      ) {
        const dollars =
          session.amount_total != null ? String(session.amount_total / 100) : ""
        try {
          await recordPurchase(sno, md.firstName ?? "", email, {
            paid_tier: tier,
            paid_amount: dollars,
          })
        } catch (e) {
          console.error("[stripe/webhook] recordPurchase failed", redactError(e))
        }
      }
      break
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session
      console.info("[stripe/webhook] checkout session expired", {
        id: session.id,
        email: session.customer_details?.email ?? session.customer_email,
        tier: session.metadata?.tier,
      })
      break
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent
      console.warn("[stripe/webhook] payment failed", {
        id: intent.id,
        amount: intent.amount,
        lastPaymentError: intent.last_payment_error?.message,
        declineCode: intent.last_payment_error?.decline_code,
        tier: intent.metadata?.tier,
      })
      break
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge
      console.warn("[stripe/webhook] charge refunded", {
        id: charge.id,
        amountRefunded: charge.amount_refunded,
        paymentIntent: charge.payment_intent,
      })
      break
    }
    default:
      console.info("[stripe/webhook] event ignored", { type: event.type })
  }

  return NextResponse.json({ received: true })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST Stripe webhook events here. Configure endpoint in Stripe dashboard → Developers → Webhooks.",
  })
}
