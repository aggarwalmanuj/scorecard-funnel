import { NextResponse } from "next/server"
import { isCosmosConfigured, readPrompts } from "@/lib/server/cosmos-db"
import { corsHeaders } from "@/lib/server/admin-auth"
import { resolvePromptValue } from "@/lib/server/challenge-prompts"
import { normalizeVertical } from "@/lib/verticals"

/** CORS preflight */
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

// Admin-edited content; force dynamic so admin saves are picked up on the
// next user request. Server-side prompt cache (challenge-prompts.ts) still
// absorbs the read load and is invalidated on the admin POST.
export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * GET /api/admin/beat-prompts?audience=<vertical>
 * Returns beat display data (label, title, subtitle, feedbackQuestion) for the
 * requested vertical, inheriting from main per key when not overridden.
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
      { ok: false, error: "Missing or invalid audience query param" },
      { status: 400, headers }
    )
  }

  if (!isCosmosConfigured()) {
    return NextResponse.json({ ok: true, beats: null }, { headers })
  }

  try {
    const data = await readPrompts()
    const beats = Array.from({ length: 5 }, (_, i) => ({
      label: resolvePromptValue(data, `beat${i + 1}_label`, audience) || "",
      title: resolvePromptValue(data, `beat${i + 1}_title`, audience) || "",
      subtitle: resolvePromptValue(data, `beat${i + 1}_subtitle`, audience) || "",
      feedbackQuestion: resolvePromptValue(data, `beat${i + 1}_feedbackQuestion`, audience) || "",
    }))
    return NextResponse.json({ ok: true, beats }, { headers })
  } catch {
    return NextResponse.json({ ok: true, beats: null }, { headers })
  }
}
