import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
        subscription: session.subscription,
        metadata: session.metadata,
      })
      break
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      console.warn("[stripe/webhook] subscription cancelled", {
        id: sub.id,
        customer: sub.customer,
        cancelAt: sub.cancel_at,
      })
      break
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      console.warn("[stripe/webhook] invoice payment failed", {
        id: invoice.id,
        customer: invoice.customer,
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
