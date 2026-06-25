import { createHash } from "crypto"

/* ═══════════════════════════════════════════════
   Meta Conversions API (server-side pixel events)
   ═══════════════════════════════════════════════

   Server-side companion to the browser Facebook Pixel. Firing events from the
   server too means conversions still reach Meta when the browser pixel is
   blocked (ad-blockers, no-JS, or a Calendly redirect that never lands the
   user back on the thank-you page).

   Deduplication: each event carries an `event_id`. The browser pixel sends the
   same id, so Meta collapses the browser + server copies into one:
     - Lead     → a uuid minted at signup (lib/submit-to-google-sheet.ts)
     - Purchase → the Stripe checkout session id / Calendly invitee uuid

   Advanced matching: every PII field is normalized + SHA-256 hashed before it
   leaves the server (em/ph/fn). Cookies (_fbp / _fbc), client IP, and user
   agent sharpen attribution further — the browser pixel matches these
   automatically; the server backstop needs them passed in (the signup request
   is same-origin, so we can read the cookies + email + phone there).

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

/** Hash a normalized (trimmed, lowercased) string. Meta requires SHA-256. */
function hashLower(value?: string | null): string[] | undefined {
  const normalized = value?.trim().toLowerCase()
  return normalized ? [sha256(normalized)] : undefined
}

/** Phone → digits only (drops +, spaces, dashes) then hashed, per Meta spec. */
function hashPhone(phone?: string | null): string[] | undefined {
  const digits = phone?.replace(/\D/g, "")
  return digits ? [sha256(digits)] : undefined
}

/** Advanced-matching signals. All optional; more present = better match rate. */
export interface CapiUserData {
  email?: string | null
  phone?: string | null
  firstName?: string | null
  clientIp?: string | null
  userAgent?: string | null
  /** _fbp / _fbc cookies set by the browser pixel. */
  fbp?: string | null
  fbc?: string | null
}

function buildUserData(user: CapiUserData): Record<string, unknown> {
  const userData: Record<string, unknown> = {}
  const em = hashLower(user.email)
  const ph = hashPhone(user.phone)
  const fn = hashLower(user.firstName)
  if (em) userData.em = em
  if (ph) userData.ph = ph
  if (fn) userData.fn = fn
  if (user.clientIp) userData.client_ip_address = user.clientIp
  if (user.userAgent) userData.client_user_agent = user.userAgent
  if (user.fbp) userData.fbp = user.fbp
  if (user.fbc) userData.fbc = user.fbc
  return userData
}

interface CapiEventInput {
  eventName: string
  /** Shared with the browser pixel for dedup. */
  eventId: string
  user: CapiUserData
  customData?: Record<string, unknown>
  eventSourceUrl?: string | null
  /** Unix seconds; defaults to now. */
  eventTime?: number
}

/**
 * Post a single event to the Conversions API. Never throws — logs and returns
 * on any failure so it can't break the caller (a webhook would otherwise retry
 * the whole delivery on a non-2xx; a signup would surface a false error).
 */
export async function sendCapiEvent(input: CapiEventInput): Promise<void> {
  if (!isMetaCapiConfigured()) return

  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: "website",
    user_data: buildUserData(input.user),
    ...(input.customData ? { custom_data: input.customData } : {}),
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
        `[meta-capi] ${input.eventName} event rejected`,
        res.status,
        detail.slice(0, 500),
      )
    }
  } catch (err) {
    console.error(`[meta-capi] ${input.eventName} event failed`, err)
  }
}

export interface PurchaseEventInput {
  /** Shared with the browser pixel for dedup (Stripe session id / Calendly invitee uuid). */
  eventId: string
  email?: string | null
  phone?: string | null
  value: number
  currency?: string
  /** e.g. "unfair-advantage-diagnostic" — matches the browser pixel's content_name. */
  contentName?: string
  eventSourceUrl?: string | null
  clientIp?: string | null
  userAgent?: string | null
  fbp?: string | null
  fbc?: string | null
  eventTime?: number
}

/** Server-side Purchase (backstop for the browser pixel). */
export async function sendPurchaseEvent(input: PurchaseEventInput): Promise<void> {
  return sendCapiEvent({
    eventName: "Purchase",
    eventId: input.eventId,
    user: {
      email: input.email,
      phone: input.phone,
      clientIp: input.clientIp,
      userAgent: input.userAgent,
      fbp: input.fbp,
      fbc: input.fbc,
    },
    customData: {
      value: input.value,
      currency: input.currency ?? "USD",
      ...(input.contentName ? { content_name: input.contentName } : {}),
    },
    eventSourceUrl: input.eventSourceUrl,
    eventTime: input.eventTime,
  })
}

export interface LeadEventInput {
  /** Shared with the browser Lead pixel for dedup (uuid minted at signup). */
  eventId: string
  user: CapiUserData
  contentName?: string
  eventSourceUrl?: string | null
}

/** Server-side Lead (backstop for the browser pixel) — the core signup event. */
export async function sendLeadEvent(input: LeadEventInput): Promise<void> {
  return sendCapiEvent({
    eventName: "Lead",
    eventId: input.eventId,
    user: input.user,
    customData: input.contentName ? { content_name: input.contentName } : undefined,
    eventSourceUrl: input.eventSourceUrl,
  })
}
