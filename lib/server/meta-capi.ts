import { createHash } from "crypto"

/* ═══════════════════════════════════════════════
   Meta Conversions API (server-side pixel events)
   ═══════════════════════════════════════════════

   Server-side companion to the browser Facebook Pixel. Firing Purchase
   from the server too means conversions still reach Meta when the browser
   pixel is blocked (ad-blockers, no-JS, or a Calendly redirect that never
   lands the user back on the thank-you page).

   Deduplication: each event carries an `event_id`. The browser pixel sends
   the same id (see lib/fbpixel.ts → trackWhenReady), so Meta collapses the
   browser + server Purchase into one. We use the Stripe checkout session id
   (Stripe path) or the Calendly invitee uuid (Calendly path).

   Required env:
     META_CONVERSIONS_API_TOKEN     System-user access token (Events Manager →
                                    Settings → Conversions API → Generate token)
     NEXT_PUBLIC_FACEBOOK_PIXEL_ID  Pixel/dataset id (already used by the browser pixel)
   Optional:
     META_CAPI_TEST_EVENT_CODE      Routes events to the "Test events" tab while verifying

   If the token or pixel id is missing, every call is a graceful no-op — the
   browser pixel keeps working on its own, exactly like before. */

const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID
const ACCESS_TOKEN = process.env.META_CONVERSIONS_API_TOKEN
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE
const GRAPH_VERSION = "v21.0"

export function isMetaCapiConfigured(): boolean {
  return Boolean(PIXEL_ID && /^\d{6,20}$/.test(PIXEL_ID) && ACCESS_TOKEN)
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

/** Meta requires PII hashed (SHA-256) and normalized (trimmed, lowercased). */
function hashEmail(email?: string | null): string[] | undefined {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return undefined
  return [sha256(normalized)]
}

export interface PurchaseEventInput {
  /** Shared with the browser pixel for dedup (Stripe session id / Calendly invitee uuid). */
  eventId: string
  email?: string | null
  value: number
  currency?: string
  /** e.g. "unfair-advantage-diagnostic" — matches the browser pixel's content_name. */
  contentName?: string
  eventSourceUrl?: string | null
  clientIp?: string | null
  userAgent?: string | null
  /** Browser cookies, when available, sharpen attribution. */
  fbp?: string | null
  fbc?: string | null
  /** Unix seconds; defaults to now. */
  eventTime?: number
}

/**
 * Send a Purchase event to the Meta Conversions API. Never throws — logs and
 * returns on any failure so it can't break the webhook that calls it (Stripe /
 * Calendly would otherwise retry the whole delivery on a non-2xx).
 */
export async function sendPurchaseEvent(input: PurchaseEventInput): Promise<void> {
  if (!isMetaCapiConfigured()) return

  const userData: Record<string, unknown> = {}
  const em = hashEmail(input.email)
  if (em) userData.em = em
  if (input.clientIp) userData.client_ip_address = input.clientIp
  if (input.userAgent) userData.client_user_agent = input.userAgent
  if (input.fbp) userData.fbp = input.fbp
  if (input.fbc) userData.fbc = input.fbc

  const event: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: "website",
    user_data: userData,
    custom_data: {
      value: input.value,
      currency: input.currency ?? "USD",
      ...(input.contentName ? { content_name: input.contentName } : {}),
    },
  }
  if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl

  const body: Record<string, unknown> = { data: [event] }
  if (TEST_EVENT_CODE) body.test_event_code = TEST_EVENT_CODE

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(
        ACCESS_TOKEN!,
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.error(
        "[meta-capi] Purchase event rejected",
        res.status,
        detail.slice(0, 500),
      )
    }
  } catch (err) {
    console.error("[meta-capi] Purchase event failed", err)
  }
}
