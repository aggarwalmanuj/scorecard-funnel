import { redactError, sanitizeForPrompt } from "@/lib/security"
import { z } from "zod"
import {
  getScoreSystemPrompt,
  getScoreUserPromptTemplate,
} from "@/lib/server/challenge-prompts"
import {
  DEFAULT_SCORE_SYSTEM_PROMPT,
  DEFAULT_SCORE_USER_PROMPT,
} from "@/lib/default-score-prompt"
import { normalizeLlmScoreOutput } from "@/lib/scoring"

/**
 * Clarity Readiness scoring - LLM-backed.
 *
 * The system prompt is admin-configurable per audience via the Score tab in
 * /admin. The shared `DEFAULT_SCORE_SYSTEM_PROMPT` is used only when no Cosmos
 * override exists. No prompt is hardcoded in this route.
 *
 * The route returns the model's JSON object as-is. Clients pull out whatever
 * fields they need (e.g. `subscores`) and fall back to heuristic scoring when
 * those fields are absent, so changing the admin prompt to produce a
 * different shape will never crash this endpoint — it will just degrade
 * gracefully on the client.
 */

const bodySchema = z.object({
  firstName: z.string().max(200).optional().default(""),
  audience: z.enum(["individual", "team"]).optional().default("individual"),
  responses: z.object({
    question1: z.string().max(50000).optional().default(""),
    question2: z.string().max(50000).optional().default(""),
    question3: z.string().max(50000).optional().default(""),
    question4: z.string().max(50000).optional().default(""),
    question5: z.string().max(50000).optional().default(""),
  }),
})

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

function applyScoreUserTemplate(
  template: string,
  firstName: string,
  r: z.infer<typeof bodySchema>["responses"]
): string {
  const name = sanitizeForPrompt((firstName || "").trim()) || "The user"
  const blank = "(left blank)"
  return template
    .replace(/\{\{NAME\}\}/g, name)
    .replace(/\{\{Q1\}\}/g, sanitizeForPrompt(r.question1?.trim() || blank))
    .replace(/\{\{Q2\}\}/g, sanitizeForPrompt(r.question2?.trim() || blank))
    .replace(/\{\{Q3\}\}/g, sanitizeForPrompt(r.question3?.trim() || blank))
    .replace(/\{\{Q4\}\}/g, sanitizeForPrompt(r.question4?.trim() || blank))
    .replace(/\{\{Q5\}\}/g, sanitizeForPrompt(r.question5?.trim() || blank))
}

function extractJsonObject(raw: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  // Strip code fences if present
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) return fenced[1].trim()
  // Try to locate the first top-level {...} block
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  return trimmed.slice(start, end + 1)
}

// ---------- handler ----------

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: parsed.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const { firstName, responses, audience } = parsed.data
  const [systemPrompt, userTemplate] = await Promise.all([
    getScoreSystemPrompt(audience, DEFAULT_SCORE_SYSTEM_PROMPT),
    getScoreUserPromptTemplate(audience, DEFAULT_SCORE_USER_PROMPT),
  ])
  const userPrompt = applyScoreUserTemplate(userTemplate, firstName, responses)

  const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini"
  const referer =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://localhost:3000"

  let upstream: Response
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": referer,
        "X-Title": "Honest Decision Challenge - Clarity Score",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: "json_object" },
      }),
    })
  } catch (e) {
    console.error("[score] upstream fetch", redactError(e))
    return new Response(JSON.stringify({ error: "Upstream service error" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "")
    console.error(
      "[score] upstream status",
      upstream.status,
      errText.slice(0, 500)
    )
    return new Response(
      JSON.stringify({
        error: "Upstream service error",
        status: upstream.status,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }

  let upstreamJson: unknown
  try {
    upstreamJson = await upstream.json()
  } catch (e) {
    console.error("[score] upstream JSON parse", redactError(e))
    return new Response(
      JSON.stringify({ error: "Malformed upstream response" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }

  const content: unknown = (
    upstreamJson as {
      choices?: Array<{ message?: { content?: unknown } }>
    }
  )?.choices?.[0]?.message?.content

  const contentStr = typeof content === "string" ? content : ""
  const jsonStr = extractJsonObject(contentStr)
  if (!jsonStr) {
    console.error(
      "[score] no JSON object in model output",
      contentStr.slice(0, 500)
    )
    return new Response(
      JSON.stringify({ error: "Model did not return JSON" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }

  let modelOutput: unknown
  try {
    modelOutput = JSON.parse(jsonStr)
  } catch (e) {
    console.error("[score] JSON.parse failed", redactError(e))
    return new Response(
      JSON.stringify({ error: "Model returned invalid JSON" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }

  // Normalize whatever shape the admin's prompt produced into the
  // 4-subscore contract the UI consumes. This is what makes the score
  // dynamic regardless of which prompt the admin saved — a simple
  // `{ score: 1-10 }` output is fanned out across the four subscores so
  // the UI sees a fresh number per submission instead of falling back to
  // the heuristic baseline.
  const normalized = normalizeLlmScoreOutput(modelOutput)
  if (!normalized) {
    console.error(
      "[score] could not normalize model output",
      JSON.stringify(modelOutput).slice(0, 500)
    )
    return new Response(
      JSON.stringify({
        error: "Model output had no recognizable score field",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }

  return new Response(JSON.stringify(normalized), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  })
}
