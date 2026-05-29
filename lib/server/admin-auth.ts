/**
 * CORS headers and server-side auth for admin API routes.
 * Used by the standalone admin.html to call the API from a different origin.
 */

import { timingSafeEqual } from "node:crypto"

const isProd = process.env.NODE_ENV === "production"

function sameOrigin(request: Request, origin: string): boolean {
  if (!origin) return false
  try {
    const reqUrl = new URL(request.url)
    const originUrl = new URL(origin)
    return reqUrl.host === originUrl.host && reqUrl.protocol === originUrl.protocol
  } catch {
    return false
  }
}

/** Returns CORS headers based on the request origin and ADMIN_ALLOWED_ORIGINS env var. */
export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") ?? ""
  const allowed = (process.env.ADMIN_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  // Determine if this origin is allowed — FAIL CLOSED.
  let allowOrigin = ""
  if (allowed.includes(origin)) {
    allowOrigin = origin
  } else if (origin === "null" && allowed.includes("null")) {
    // file:// sends Origin: null
    allowOrigin = "null"
  } else if (allowed.length === 0) {
    // No whitelist configured. Allow only same-origin in production; any origin in dev.
    if (!isProd) {
      allowOrigin = origin || "*"
    } else if (sameOrigin(request, origin)) {
      allowOrigin = origin
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
    "Access-Control-Max-Age": "86400",
  }
}

/** Constant-time compare of a provided secret against an expected env value.
 *  Returns false when the expected value is unset (fail closed). */
function timingSafeMatch(provided: string, expected: string | undefined): boolean {
  const exp = expected?.trim()
  if (!exp || !provided) return false

  const a = Buffer.from(provided, "utf8")
  const b = Buffer.from(exp, "utf8")
  // timingSafeEqual requires equal-length buffers. Compare lengths too — both
  // checks combined stay constant-time w.r.t. the actual secret contents.
  if (a.length !== b.length) {
    try {
      timingSafeEqual(b, b) // dummy compare to normalize timing
    } catch {
      /* noop */
    }
    return false
  }
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * Admin access. Accepts EITHER the standard admin password OR the tech-admin
 * password — tech is an elevated, superset role, so the tech credential can
 * use every admin route (prompts, responses) the shared console calls. Uses a
 * constant-time comparison to prevent timing attacks.
 */
export function isAdminAuthorized(request: Request): boolean {
  const provided = request.headers.get("x-admin-password")?.trim() ?? ""
  if (!provided) return false
  return (
    timingSafeMatch(provided, process.env.ADMIN_API_PASSWORD) ||
    timingSafeMatch(provided, process.env.TECHADMIN_API_PASSWORD)
  )
}

/**
 * Tech-admin access. Accepts ONLY the dedicated TECHADMIN_API_PASSWORD — gates
 * the /techadmin-exclusive surfaces (analytics, telemetry). The regular admin
 * password does NOT pass here, which is what keeps the two consoles separate.
 */
export function isTechAuthorized(request: Request): boolean {
  const provided = request.headers.get("x-admin-password")?.trim() ?? ""
  if (!provided) return false
  return timingSafeMatch(provided, process.env.TECHADMIN_API_PASSWORD)
}
