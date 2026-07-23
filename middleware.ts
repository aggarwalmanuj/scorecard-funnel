import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { HEADLINE_COOKIE } from "@/lib/headline-shared"
import { verticalFromHost } from "@/lib/verticals"

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

/* ─────────────────────────────────────────────
   Headline A/B — server-side assignment.
   Middleware picks (or recalls) the visitor's variant and rewrites `/` to
   the pre-rendered /hl/[id] page, so the first byte of HTML already carries
   the assigned headline: no skeleton, no client-side swap, CDN-static TTFB.
   ───────────────────────────────────────────── */

// Per-instance cache of active variant ids. Misses cost one same-origin
// API round-trip (the route is CDN-cached for 5 min and instance-cached in
// cosmos-db); within the TTL the pick is pure in-memory work.
let hlIdsCache: { ids: string[]; at: number } | null = null
const HL_IDS_TTL_MS = 60_000

async function getActiveHeadlineIds(origin: string): Promise<string[]> {
  if (hlIdsCache && Date.now() - hlIdsCache.at < HL_IDS_TTL_MS) {
    return hlIdsCache.ids
  }
  try {
    const res = await fetch(`${origin}/api/headlines`)
    const json = (await res.json()) as {
      headlines?: Array<{ id?: unknown }>
    }
    const ids = Array.isArray(json.headlines)
      ? json.headlines
          .map((h) => (typeof h.id === "string" ? h.id : ""))
          .filter(Boolean)
      : []
    hlIdsCache = { ids, at: Date.now() }
    return ids
  } catch {
    // Fetch failed: fall back to the stale cache (a coherent experiment
    // state), else serve the default landing (empty list).
    return hlIdsCache?.ids ?? []
  }
}

// Legacy audience segments → canonical vertical. Mid-funnel users and old
// deep links from before the verticals migration (2026-07-22) land on the
// same step under /challenge/main/*. Query strings are preserved.
const LEGACY_AUDIENCE_RE = /^\/challenge\/(?:individual|team)(\/.*)?$/

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl

  const legacyMatch = pathname.match(LEGACY_AUDIENCE_RE)
  if (legacyMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/challenge/main${legacyMatch[1] ?? ""}`
    return NextResponse.redirect(url, 308)
  }

  // ── Subdomain verticals ──
  // adhd.aimerge.live / retarget.aimerge.live / business.aimerge.live are
  // the verticals' public entry points. The resolved vertical rides to
  // server components as the x-vertical request header, and a vertical
  // subdomain's ROOT goes straight to the funnel entry (per the funnel
  // contract: vertical landing pages hand off directly to name-gathering;
  // the marketing landing lives on the apex domain only).
  const hostVertical = verticalFromHost(request.headers.get("host"))
  if (hostVertical && hostVertical !== "main" && pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/challenge/audience"
    return NextResponse.redirect(url, 307)
  }

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
  if (hostVertical) requestHeaders.set("x-vertical", hostVertical)

  // Headline A/B: rewrite `/` to the visitor's assigned variant page.
  // Skipped entirely when the experiment is off (no active variants).
  let response: NextResponse | null = null
  if (pathname === "/") {
    const ids = await getActiveHeadlineIds(request.nextUrl.origin)
    if (ids.length > 0) {
      const cookie = request.cookies.get(HEADLINE_COOKIE)?.value
      const sticky = cookie && ids.includes(cookie) ? cookie : null
      const id = sticky ?? ids[Math.floor(Math.random() * ids.length)]

      const url = request.nextUrl.clone()
      url.pathname = `/hl/${id}`
      response = NextResponse.rewrite(url, {
        request: { headers: requestHeaders },
      })

      if (!sticky) {
        // New assignment: persist it and count the unique visitor. The
        // impression POST is server-side (ad blockers can't drop it) and
        // rides waitUntil so it never delays the page.
        response.cookies.set(HEADLINE_COOKIE, id, {
          maxAge: 60 * 60 * 24 * 180,
          path: "/",
          sameSite: "lax",
        })
        event.waitUntil(
          fetch(`${request.nextUrl.origin}/api/headlines`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          }).catch(() => {}),
        )
      }
    }
  }

  if (!response) {
    response = NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

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
