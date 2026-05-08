import { NextResponse } from "next/server"
import { z } from "zod"
import { getStripe } from "@/lib/stripe"

const Body = z.object({
  email: z.string().email(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  audience: z.enum(["individual", "team"]).optional(),
})

export async function POST(req: Request) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { email, firstName, lastName, audience } = parsed.data

  const forwardedHost = req.headers.get("x-forwarded-host")
  const forwardedProto = req.headers.get("x-forwarded-proto")
  const host = forwardedHost ?? req.headers.get("host")
  const proto = forwardedProto ?? (host?.startsWith("localhost") ? "http" : "https")
  const siteUrl = host
    ? `${proto}://${host}`
    : (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
       new URL(req.url).origin)

  const successUrl = `${siteUrl}/challenge/thank-you?paid=1${
    audience ? `&audience=${audience}` : ""
  }&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = audience
    ? `${siteUrl}/challenge/${audience}/offer`
    : `${siteUrl}/`

  try {
    const stripe = getStripe()
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: 9900,
            recurring: { interval: "month" },
            product_data: {
              name: "The Honest Decision Session",
              description:
                "60-minute private decision session with Manuj Aggarwal. Cancel any time.",
            },
          },
        },
      ],
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        source: "scorecard-funnel",
        audience: audience ?? "",
        firstName: firstName ?? "",
        lastName: lastName ?? "",
        fullName,
      },
      subscription_data: {
        metadata: {
          source: "scorecard-funnel",
          audience: audience ?? "",
          firstName: firstName ?? "",
          lastName: lastName ?? "",
        },
      },
    })

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 502 },
      )
    }

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (err) {
    console.error("[stripe/checkout] failed:", err)
    return NextResponse.json(
      {
        error: "Could not create checkout session",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    )
  }
}
