import { NextResponse } from "next/server"
import { isCosmosConfigured, readPrompts } from "@/lib/server/cosmos-db"
import { corsHeaders } from "@/lib/server/admin-auth"

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
 * GET /api/admin/question-prompts?audience=individual|team
 *
 * Returns the question + beat-display data for the requested audience.
 * No fallback to the other audience - when keys are missing the response
 * is `{ ok: true, questions: null, beats: null }` so the UI can show an
 * empty state.
 */
export async function GET(request: Request) {
  const headers: Record<string, string> = {
    ...(corsHeaders(request) as Record<string, string>),
    "Cache-Control": "private, no-store, must-revalidate",
  }

  const url = new URL(request.url)
  const audienceParam = url.searchParams.get("audience")
  const audience = audienceParam === "team" || audienceParam === "individual" ? audienceParam : null

  if (!audience) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid audience query param (must be 'individual' or 'team')" },
      { status: 400, headers }
    )
  }

  if (!isCosmosConfigured()) {
    return NextResponse.json({ ok: true, questions: null, beats: null }, { headers })
  }

  try {
    const data = await readPrompts()
    const questionsKey = `questions_${audience}`
    let questions: unknown = null
    if (data[questionsKey]) {
      try {
        questions = JSON.parse(data[questionsKey])
      } catch {
        questions = null
      }
    }
    const beats = Array.from({ length: 5 }, (_, i) => {
      const label = data[`beat${i + 1}_label_${audience}`] || ""
      const title = data[`beat${i + 1}_title_${audience}`] || ""
      const subtitle = data[`beat${i + 1}_subtitle_${audience}`] || ""
      const feedbackQuestion = data[`beat${i + 1}_feedbackQuestion_${audience}`] || ""
      return { label, title, subtitle, feedbackQuestion }
    })
    return NextResponse.json({ ok: true, questions, beats }, { headers })
  } catch {
    return NextResponse.json({ ok: true, questions: null, beats: null }, { headers })
  }
}
