import { NextResponse } from "next/server"
import {
  isCosmosConfigured,
  listActiveHeadlines,
  recordHeadlineImpression,
} from "@/lib/server/cosmos-db"
import { redactError } from "@/lib/security"

/**
 * Public headline A/B endpoints (no auth — this is landing-page surface area).
 *
 * GET  → the active headline variants. The client picks one uniformly at
 *        random, stores the assignment in localStorage (sticky), and renders
 *        it in the hero. Edge-cached briefly so a traffic spike doesn't
 *        hammer Cosmos.
 * POST → { id } one-time impression ping, fired only when a NEW assignment is
 *        made, so `impressions` counts unique assigned visitors.
 */

export async function GET() {
  if (!isCosmosConfigured()) {
    return NextResponse.json({ ok: true, headlines: [] })
  }
  try {
    const headlines = await listActiveHeadlines()
    return NextResponse.json(
      { ok: true, headlines },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    )
  } catch (e) {
    console.error("[headlines GET]", redactError(e))
    // Fail open with an empty list — the hero falls back to the default copy.
    return NextResponse.json({ ok: true, headlines: [] })
  }
}

export async function POST(request: Request) {
  if (!isCosmosConfigured()) {
    return NextResponse.json({ ok: true, skipped: true })
  }
  let id = ""
  try {
    const body = (await request.json()) as { id?: unknown }
    if (typeof body.id === "string") id = body.id.trim().slice(0, 100)
  } catch {
    /* fall through to validation below */
  }
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })
  }
  try {
    await recordHeadlineImpression(id)
  } catch (e) {
    // Impressions are best-effort; never surface a failure to the visitor.
    console.error("[headlines POST]", redactError(e))
  }
  return NextResponse.json({ ok: true })
}
