import { NextResponse, type NextRequest } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

/* ─────────────────────────────────────────────
   Security middleware — nonce-based CSP,
   security headers, and per-IP rate limiting
   ───────────────────────────────────────────── */

const RATE_LIMIT_WINDOW = "60 s" as const
const RATE_LIMIT_MAX_REQUESTS = 60

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

const ratelimit =
  upstashUrl && upstashToken
    ? new Ratelimit({
        redis: new Redis({ url: upstashUrl, token: upstashToken }),
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW),
        analytics: false,
        prefix: "rl:api",
      })
    : null

// Dev-only in-memory fallback so local development works without Upstash.
// Not used in production: missing env vars there means rate limiting is disabled
// (logged once below) rather than silently giving a false sense of security.
const devRateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000

function isRateLimitedDev(ip: string): boolean {
  const now = Date.now()
  const entry = devRateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    devRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX_REQUESTS
}

if (!ratelimit && process.env.NODE_ENV === "production") {
  // eslint-disable-next-line no-console
  console.warn(
    "[middleware] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — API rate limiting is DISABLED in production."
  )
}

function base64UrlEncode(bytes: Uint8Array): string {
  // Prefer btoa (available in Edge runtime + browsers), fall back to Buffer (Node).
  if (typeof btoa === "function") {
    let binary = ""
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary).replace(/=+$/, "")
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64").replace(/=+$/, "")
  }
  throw new Error("No base64 encoder available in this runtime")
}

function generateNonce(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

    let limited = false
    if (ratelimit) {
      const { success } = await ratelimit.limit(ip)
      limited = !success
    } else if (process.env.NODE_ENV !== "production") {
      limited = isRateLimitedDev(ip)
    }

    if (limited) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
      )
    }
  }

  const nonce = generateNonce()
  const isDev = process.env.NODE_ENV !== "production"

  // PostHog hosts are NOT listed here — all PostHog traffic (events,
  // feature flags, asset chunks) is reverse-proxied through `/ingest`
  // (see next.config.mjs rewrites) and is therefore same-origin, covered
  // by 'self'. Keeping *.posthog.com out of the trusted-origin set keeps
  // CSP tight. The session recorder still spawns a Web Worker from a
  // blob URL even when the script itself is same-origin, so the
  // `worker-src 'self' blob:` directive below is still required.
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    isDev ? "'unsafe-eval'" : "",
    "https://assets.calendly.com",
    "https://connect.facebook.net",
    // Google Analytics (gtag.js). Modern browsers honour strict-dynamic
    // and ignore this host entry, but it's the fallback allowlist for
    // browsers that don't support strict-dynamic.
    "https://www.googletagmanager.com",
  ]
    .filter(Boolean)
    .join(" ")

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://assets.calendly.com",
    "img-src 'self' data: blob: https://hebbkx1anhila5yf.public.blob.vercel-storage.com https://bfyvfetxtgsgzjci.public.blob.vercel-storage.com https://www.facebook.com https://www.googletagmanager.com https://www.google-analytics.com",
    // The Vercel blob host serves the testimonial videos. Without
    // explicit media-src, the browser silently CSP-blocks the <video>
    // element with an empty player and no console error.
    "media-src 'self' blob: https://bfyvfetxtgsgzjci.public.blob.vercel-storage.com",
    "font-src 'self' data:",
    "connect-src 'self' https://openrouter.ai https://www.googleapis.com https://calendly.com https://connect.facebook.net https://www.facebook.com https://bfyvfetxtgsgzjci.public.blob.vercel-storage.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
    "worker-src 'self' blob:",
    "frame-src 'self' https://calendly.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ")

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("content-security-policy", csp)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  response.headers.set("Content-Security-Policy", csp)
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()")
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  )

  return response
}

export const config = {
  matcher: [
    {
      // `ingest` is excluded because those paths are PostHog reverse-proxy
      // rewrites (see next.config.mjs). Running middleware on them would
      // attach a nonce/CSP to PostHog's JSON responses (harmless but
      // pointless) and — more importantly — would subject high-frequency
      // session-recording POSTs to the per-IP API rate limit.
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|images/|ingest/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
