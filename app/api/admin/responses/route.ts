import { NextResponse } from "next/server"
import { isCosmosConfigured, fetchUsers } from "@/lib/server/cosmos-db"
import { redactError } from "@/lib/security"
import { corsHeaders, isAdminAuthorized } from "@/lib/server/admin-auth"

/** CORS preflight */
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

/**
 * GET /api/admin/responses - Read user responses from Cosmos DB (auth required).
 * Query params: pageSize (default 25, max 100), offset (default 0).
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
  const pageSize = Math.min(Math.max(parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25, 1), 100)
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10) || 0, 0)

  try {
    const result = await fetchUsers(pageSize, offset)
    return NextResponse.json(
      { ok: true, users: result.users, nextOffset: result.nextOffset, hasMore: result.hasMore },
      { headers }
    )
  } catch (e) {
    console.error("[admin/responses GET]", redactError(e))
    return NextResponse.json(
      { ok: false, error: "Failed to read responses" },
      { status: 502, headers }
    )
  }
}
