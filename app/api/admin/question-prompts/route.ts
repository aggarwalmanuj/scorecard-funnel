import { NextResponse } from "next/server"
import { isCosmosConfigured, readPrompts } from "@/lib/server/cosmos-db"
import { corsHeaders } from "@/lib/server/admin-auth"
import { resolvePromptValue } from "@/lib/server/challenge-prompts"
import { normalizeVertical } from "@/lib/verticals"

/** CORS preflight */
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

// Admin-edited content; staleness is unacceptable here. The cheap server
// cache in challenge-prompts.ts (5min TTL, invalidated on POST) absorbs
// repeat reads, so the public-facing CDN/browser cache adds no value and
// only masks admin edits. Force this route fully dynamic.
export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * GET /api/admin/question-prompts?audience=<vertical>
 *
 * Returns the question + beat-display data for the requested vertical.
 * Each key inherits from main when the vertical hasn't overridden it
 * (resolvePromptValue), so an unseeded vertical serves main's copy.
 */
export async function GET(request: Request) {
  const headers: Record<string, string> = {
    ...(corsHeaders(request) as Record<string, string>),
    "Cache-Control": "private, no-store, must-revalidate",
  }

  const url = new URL(request.url)
  const audience = normalizeVertical(url.searchParams.get("audience"))

  if (!audience) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid audience query param (must be a known vertical id)" },
      { status: 400, headers }
    )
  }

  if (!isCosmosConfigured()) {
    return NextResponse.json({ ok: true, questions: null, beats: null }, { headers })
  }

  try {
    const data = await readPrompts()
    let questions: unknown = null
    const questionsRaw = resolvePromptValue(data, "questions", audience)
    if (questionsRaw) {
      try {
        questions = JSON.parse(questionsRaw)
      } catch {
        questions = null
      }
    }
    const beats = Array.from({ length: 5 }, (_, i) => {
      const label = resolvePromptValue(data, `beat${i + 1}_label`, audience) || ""
      const title = resolvePromptValue(data, `beat${i + 1}_title`, audience) || ""
      const subtitle = resolvePromptValue(data, `beat${i + 1}_subtitle`, audience) || ""
      const feedbackQuestion = resolvePromptValue(data, `beat${i + 1}_feedbackQuestion`, audience) || ""
      return { label, title, subtitle, feedbackQuestion }
    })
    return NextResponse.json({ ok: true, questions, beats }, { headers })
  } catch {
    return NextResponse.json({ ok: true, questions: null, beats: null }, { headers })
  }
}
