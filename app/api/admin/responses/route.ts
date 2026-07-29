import { NextResponse } from "next/server"
import { isCosmosConfigured, fetchUsers, deleteUserRows } from "@/lib/server/cosmos-db"
import { redactError } from "@/lib/security"
import { corsHeaders, isAdminAuthorized } from "@/lib/server/admin-auth"
import { z } from "zod"

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

/** Bounded so a malformed/hostile call can't wipe the table in one request. */
const deleteSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(100),
})

/**
 * DELETE /api/admin/responses - permanently remove user rows (auth required).
 * Body: { ids: string[] }  (serial numbers, max 100 per call)
 *
 * Irreversible: the row and every answer, beat output, score and report it
 * holds are destroyed. The client is responsible for confirming intent.
 */
export async function DELETE(request: Request) {
  const headers = corsHeaders(request)

  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers })
  }

  if (!isCosmosConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Cosmos DB not configured" },
      { status: 503, headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers })
  }

  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Expected { ids: string[] } with 1-100 entries" },
      { status: 400, headers }
    )
  }

  try {
    const result = await deleteUserRows(parsed.data.ids)
    console.warn(
      `[admin/responses DELETE] removed ${result.deleted.length} row(s):`,
      result.deleted.join(",")
    )
    return NextResponse.json({ ok: true, ...result }, { headers })
  } catch (e) {
    console.error("[admin/responses DELETE]", redactError(e))
    return NextResponse.json(
      { ok: false, error: "Failed to delete responses" },
      { status: 502, headers }
    )
  }
}
