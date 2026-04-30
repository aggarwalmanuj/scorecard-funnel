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

/** Check the X-Admin-Password header against the server-only ADMIN_API_PASSWORD env var.
 *  Uses a constant-time comparison to prevent timing attacks. */
export function isAdminAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_API_PASSWORD?.trim()
  if (!expected) return false // no password configured — block access entirely

  const provided = request.headers.get("x-admin-password")?.trim() ?? ""
  if (!provided) return false

  const a = Buffer.from(provided, "utf8")
  const b = Buffer.from(expected, "utf8")
  // timingSafeEqual requires equal-length buffers. Pad the shorter one, then
  // also compare lengths — both checks combined are still constant-time w.r.t.
  // the actual secret contents.
  if (a.length !== b.length) {
    // Still run a dummy compare of equal length to normalize timing.
    try {
      timingSafeEqual(b, b)
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
