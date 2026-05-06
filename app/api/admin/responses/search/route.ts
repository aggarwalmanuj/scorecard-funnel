import { NextResponse } from "next/server"
import { isCosmosConfigured, searchUsers } from "@/lib/server/cosmos-db"
import { redactError } from "@/lib/security"
import { corsHeaders, isAdminAuthorized } from "@/lib/server/admin-auth"

/** CORS preflight */
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

/**
 * GET /api/admin/responses/search - Search user responses with filters.
 * Query params: q (text search), dateFrom, dateTo, completed (true/false)
 */
export async function GET(request: Request) {
  const headers = corsHeaders(request)

  if (!isAdminAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers }
    )
  }

  if (!isCosmosConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Cosmos DB not configured" },
      { status: 503, headers }
    )
  }

  const url = new URL(request.url)
  const q = url.searchParams.get("q") || undefined
  const dateFrom = url.searchParams.get("dateFrom") || undefined
  const dateTo = url.searchParams.get("dateTo") || undefined
  const completedParam = url.searchParams.get("completed")
  const hasCompleted = completedParam === "true" ? true : completedParam === "false" ? false : undefined

  try {
    const users = await searchUsers({ query: q, dateFrom, dateTo, hasCompleted })
    return NextResponse.json({ ok: true, users }, { headers })
  } catch (e) {
    console.error("[admin/responses/search GET]", redactError(e))
    return NextResponse.json(
      { ok: false, error: "Search failed" },
      { status: 502, headers }
    )
  }
}
