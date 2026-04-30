import { NextResponse } from "next/server"
import { isCosmosConfigured, readPrompts, writePrompts } from "@/lib/server/cosmos-db"
import { redactError } from "@/lib/security"
import { corsHeaders, isAdminAuthorized } from "@/lib/server/admin-auth"

/** CORS preflight */
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

/**
 * GET /api/admin/prompts — Read all prompts (auth required)
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

  try {
    const data = await readPrompts()
    return NextResponse.json({ ok: true, data }, { headers })
  } catch (e) {
    console.error("[admin/prompts GET]", redactError(e))
    return NextResponse.json(
      { ok: false, error: "Failed to read prompts" },
      { status: 502, headers }
    )
  }
}

/**
 * POST /api/admin/prompts — Write all prompts to Sheet2 (auth required)
 * Body: { data: Record<string, string> }
 * Header: X-Admin-Password
 */
export async function POST(request: Request) {
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400, headers }
    )
  }

  const data = (body as { data?: Record<string, string> })?.data
  if (!data || typeof data !== "object") {
    return NextResponse.json(
      { ok: false, error: "Missing 'data' object in body" },
      { status: 400, headers }
    )
  }

  try {
    await writePrompts(data)
    const { invalidatePromptCache } = await import("@/lib/server/challenge-prompts")
    invalidatePromptCache()

    return NextResponse.json({ ok: true }, { headers })
  } catch (e) {
    console.error("[admin/prompts POST]", redactError(e))
    return NextResponse.json(
      { ok: false, error: "Failed to write prompts" },
      { status: 502, headers }
    )
  }
}
