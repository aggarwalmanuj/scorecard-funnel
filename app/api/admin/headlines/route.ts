import { NextResponse } from "next/server"
import { z } from "zod"
import {
  isCosmosConfigured,
  listHeadlines,
  createHeadline,
  updateHeadline,
  deleteHeadline,
  fetchHeadlineStats,
} from "@/lib/server/cosmos-db"
import { redactError } from "@/lib/security"
import { corsHeaders, isAdminAuthorized } from "@/lib/server/admin-auth"

/**
 * Admin CRUD + results for headline A/B variants.
 *
 * GET    → all variants (active + paused) joined with per-variant funnel
 *          outcomes (signups → purchases + revenue) derived from user docs.
 * POST   → create a variant { line1, line2?, active? }.
 * PUT    → update a variant { id, line1?, line2?, active? }.
 * DELETE → ?id=… remove a variant (its historical stats survive on user docs
 *          via the headline_text snapshot).
 */

const createSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  active: z.boolean().optional(),
})

const updateSchema = z.object({
  id: z.string().min(1).max(100),
  line1: z.string().trim().min(1).max(200).optional(),
  line2: z.string().trim().max(200).optional(),
  active: z.boolean().optional(),
})

function guard(request: Request) {
  const headers = corsHeaders(request)
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers })
  }
  if (!isCosmosConfigured()) {
    return NextResponse.json({ ok: false, error: "Cosmos DB not configured" }, { status: 503, headers })
  }
  return null
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

export async function GET(request: Request) {
  const denied = guard(request)
  if (denied) return denied
  const headers = corsHeaders(request)
  try {
    const [headlines, stats] = await Promise.all([listHeadlines(), fetchHeadlineStats()])
    return NextResponse.json({ ok: true, headlines, stats }, { headers })
  } catch (e) {
    console.error("[admin/headlines GET]", redactError(e))
    return NextResponse.json({ ok: false, error: "Failed to read headlines" }, { status: 502, headers })
  }
}

export async function POST(request: Request) {
  const denied = guard(request)
  if (denied) return denied
  const headers = corsHeaders(request)
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Validation failed" }, { status: 400, headers })
  }
  try {
    const headline = await createHeadline(parsed.data)
    return NextResponse.json({ ok: true, headline }, { headers })
  } catch (e) {
    console.error("[admin/headlines POST]", redactError(e))
    return NextResponse.json({ ok: false, error: "Failed to create headline" }, { status: 502, headers })
  }
}

export async function PUT(request: Request) {
  const denied = guard(request)
  if (denied) return denied
  const headers = corsHeaders(request)
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Validation failed" }, { status: 400, headers })
  }
  const { id, ...updates } = parsed.data
  try {
    await updateHeadline(id, updates)
    return NextResponse.json({ ok: true }, { headers })
  } catch (e) {
    console.error("[admin/headlines PUT]", redactError(e))
    return NextResponse.json({ ok: false, error: "Failed to update headline" }, { status: 502, headers })
  }
}

export async function DELETE(request: Request) {
  const denied = guard(request)
  if (denied) return denied
  const headers = corsHeaders(request)
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? ""
  if (!id || id.length > 100) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400, headers })
  }
  try {
    await deleteHeadline(id)
    return NextResponse.json({ ok: true }, { headers })
  } catch (e) {
    console.error("[admin/headlines DELETE]", redactError(e))
    return NextResponse.json({ ok: false, error: "Failed to delete headline" }, { status: 502, headers })
  }
}
