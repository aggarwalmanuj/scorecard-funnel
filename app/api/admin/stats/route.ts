import { NextResponse } from "next/server"
import { isCosmosConfigured, fetchFunnelStats } from "@/lib/server/cosmos-db"
import { redactError } from "@/lib/security"
import { corsHeaders, isTechAuthorized } from "@/lib/server/admin-auth"

/** CORS preflight */
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

/**
 * GET /api/admin/stats — funnel analytics for the /techadmin console
 * (auth required). Aggregates the whole users container into per-stage counts,
 * purchases by tier, and revenue.
 */
export async function GET(request: Request) {
  const headers = corsHeaders(request)

  if (!isTechAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers })
  }
  if (!isCosmosConfigured()) {
    return NextResponse.json({ ok: false, error: "Cosmos DB not configured" }, { status: 503, headers })
  }

  try {
    const stats = await fetchFunnelStats()
    return NextResponse.json({ ok: true, stats }, { headers })
  } catch (e) {
    console.error("[admin/stats GET]", redactError(e))
    return NextResponse.json({ ok: false, error: "Failed to compute stats" }, { status: 502, headers })
  }
}
