/**
 * Brings a buyer back to the subdomain they took the assessment on.
 *
 * Each vertical runs on its own subdomain (parents.aimerge.live,
 * adhd.aimerge.live, ...), and the assessment the report is built from lives
 * in that origin's localStorage. The $47 Stripe Payment Link is shared by every
 * B2C vertical and has exactly ONE success URL, so a buyer from any subdomain
 * but that URL's lands on a thank-you page whose storage is empty: no name, no
 * answers, a report that says "Nothing here yet".
 *
 * localStorage cannot cross subdomains, but a cookie scoped to the shared
 * parent domain can. The offer page records its origin just before handing
 * off to Stripe; the thank-you page reads it and, if it is a different sibling
 * origin, reloads itself there with the same query string.
 */

const COOKIE = "ufa_funnel_origin"
const MAX_AGE_S = 60 * 60 * 24

/** The parent domain every vertical subdomain shares, e.g. "aimerge.live". */
function sharedDomain(): string {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://aimerge.live")
    return url.hostname.replace(/^www\./, "")
  } catch {
    return "aimerge.live"
  }
}

function isSiblingHost(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

/** Call immediately before leaving for checkout. No-op off the shared domain
 *  (localhost, previews), where there is only one origin anyway. */
export function rememberFunnelOrigin(): void {
  try {
    const domain = sharedDomain()
    const { hostname, origin, protocol } = window.location
    if (!isSiblingHost(hostname, domain)) return
    document.cookie =
      `${COOKIE}=${encodeURIComponent(origin)}; Domain=${domain}; Path=/; ` +
      `Max-Age=${MAX_AGE_S}; SameSite=Lax${protocol === "https:" ? "; Secure" : ""}`
  } catch {
    /* cookies blocked - the buyer lands wherever Stripe sends them */
  }
}

/**
 * The origin to send this page to, or null to stay. Pure so it can be tested:
 * only a sibling origin on the shared domain, over the same protocol, is ever
 * returned, so the cookie cannot be used to redirect anywhere else.
 */
export function returnOriginFrom(
  cookieValue: string | null | undefined,
  current: { origin: string; protocol: string },
  domain: string,
): string | null {
  if (!cookieValue) return null
  let target: URL
  try {
    target = new URL(cookieValue)
  } catch {
    return null
  }
  if (target.protocol !== current.protocol) return null
  if (!isSiblingHost(target.hostname, domain)) return null
  if (target.origin === current.origin) return null
  return target.origin
}

/** Read on the thank-you page. */
export function funnelOriginToReturnTo(): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))
    const value = m ? decodeURIComponent(m[1]) : null
    return returnOriginFrom(value, window.location, sharedDomain())
  } catch {
    return null
  }
}
