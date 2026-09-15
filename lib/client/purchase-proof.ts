/**
 * What the report gate knows about a purchase, and how it decides.
 *
 * The thank-you page is the one place a buyer is guaranteed to pass through
 * after paying, so it records the purchase here. The report page reads it back,
 * which keeps the unlock working when the report is opened later, from a
 * bookmark, or from a link that lost its `session_id`.
 *
 * None of this is proof of payment - localStorage is the visitor's to edit.
 * Proof is /api/stripe/verify-session asking Stripe. What the stored record
 * decides is only which screen a visitor sees when that proof is missing: a
 * buyer is told their payment is being confirmed, never asked to pay again.
 */

const STORAGE_KEY = "ufa-purchase"

export interface PurchaseRecord {
  sessionId?: string
  tier?: string
  at: string
}

export function rememberPurchase(record: Omit<PurchaseRecord, "at">): void {
  try {
    const prev = recallPurchase()
    const next: PurchaseRecord = {
      // A later redirect without an id must not erase one we already have.
      sessionId: record.sessionId || prev?.sessionId,
      tier: record.tier || prev?.tier,
      at: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* storage blocked - the URL params still carry this visit */
  }
}

export function recallPurchase(): PurchaseRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PurchaseRecord>
    if (!parsed || typeof parsed !== "object" || typeof parsed.at !== "string") return null
    return {
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : undefined,
      tier: typeof parsed.tier === "string" ? parsed.tier : undefined,
      at: parsed.at,
    }
  } catch {
    return null
  }
}

export type ReportAccess = "allowed" | "unconfirmed" | "denied"

/**
 * The report gate's decision once verification has answered.
 *
 *  - Stripe confirmed a payment: allowed.
 *  - Stripe could not be asked (outage, missing or restricted key) and the
 *    visitor arrived as a buyer: allowed. The failure is ours, not theirs,
 *    and the server logs it loudly. A forged arrival gains nothing from this
 *    unless our Stripe access is already broken.
 *  - Stripe answered "no payment found" for a visitor who arrived as a buyer:
 *    unconfirmed - a screen that says so and offers retry and support, not
 *    the sales paywall.
 *  - Anyone else: denied (the paywall).
 */
export function decideReportAccess(args: {
  paid: boolean
  unverifiable: boolean
  arrivedAsBuyer: boolean
}): ReportAccess {
  if (args.paid) return "allowed"
  if (!args.arrivedAsBuyer) return "denied"
  return args.unverifiable ? "allowed" : "unconfirmed"
}
