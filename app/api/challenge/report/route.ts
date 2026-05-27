import { redactError, sanitizeForPrompt } from "@/lib/security"
import { z } from "zod"
import {
  buildClarityScoreFromSubscores,
  normalizeLlmScoreOutput,
  scoreClarity,
  type ClarityScore,
  type Subscores,
} from "@/lib/scoring"
import {
  getReportSystemPrompt,
  getReportUserPromptTemplate,
  getScoreSystemPrompt,
  getScoreUserPromptTemplate,
} from "@/lib/server/challenge-prompts"
import {
  DEFAULT_REPORT_SYSTEM_PROMPT,
  DEFAULT_REPORT_USER_PROMPT,
} from "@/lib/default-report-prompt"
import {
  DEFAULT_SCORE_SYSTEM_PROMPT,
  DEFAULT_SCORE_USER_PROMPT,
} from "@/lib/default-score-prompt"

/**
 * /api/challenge/report
 *
 * Builds a deep, fully-tailored Clarity Readiness Report for the printable
 * /challenge/report page. Runs scoring + narrative generation in parallel so
 * the user only waits for the slower of the two LLM calls.
 *
 * Input body:
 *   { firstName, email?, responses: {q1..q5}, beats: {beat1..beat5} }
 *
 * Output JSON:
 *   {
 *     clarity:   ClarityScore,           // numbers + bands + comparison
 *     reasons:   { directionClarity, identityAlignment, decisionReadiness, energyAlignment },
 *     nsState?:  string,
 *     report: {
 *       headline:   string,              // one-line thesis
 *       thread:     string,              // 2-3 sentences naming the throughline
 *       pillars: [
 *         { key, narrative, evidence, focus }
 *       ],
 *       themes:     [{ title, body }],
 *       beats:      [{ n, title, quote, reflection }],
 *       takeaways:  [{ title, body, urgency: "now"|"week"|"month" }],
 *       thirtyDay:  string
 *     },
 *     scoreSource: "llm" | "fallback"
 *   }
 */

const bodySchema = z.object({
  firstName: z.string().max(200).optional().default(""),
  email: z.string().max(320).optional().default(""),
  audience: z.enum(["individual", "team"]).optional().default("individual"),
  responses: z.object({
    question1: z.string().max(50000).optional().default(""),
    question2: z.string().max(50000).optional().default(""),
    question3: z.string().max(50000).optional().default(""),
    question4: z.string().max(50000).optional().default(""),
    question5: z.string().max(50000).optional().default(""),
  }),
  beats: z.object({
    beat1: z.string().max(50000).optional().default(""),
    beat2: z.string().max(50000).optional().default(""),
    beat3: z.string().max(50000).optional().default(""),
    beat4: z.string().max(50000).optional().default(""),
    beat5: z.string().max(50000).optional().default(""),
  }),
  /** Precomputed clarity score from the clarity-score page. When supplied,
   *  the route skips its own LLM scoring call and uses these numbers, so
   *  the score-reveal page and the downloadable report show identical
   *  values (LLMs aren't fully deterministic even at low temperature). */
  precomputedScore: z
    .object({
      subscores: z.object({
        directionClarity: z.number().int().min(0).max(100),
        identityAlignment: z.number().int().min(0).max(100),
        decisionReadiness: z.number().int().min(0).max(100),
        energyAlignment: z.number().int().min(0).max(100),
      }),
      reasons: z
        .object({
          directionClarity: z.string().max(500).optional(),
          identityAlignment: z.string().max(500).optional(),
          decisionReadiness: z.string().max(500).optional(),
          energyAlignment: z.string().max(500).optional(),
        })
        .optional(),
      nsState: z.string().max(40).optional(),
    })
    .optional(),
})

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

// ───────────────────────── scoring (parallel call #1) ─────────────────────────
//
// The system prompt for this parallel scoring call is admin-configurable via
// the Score tab in /admin — same source of truth as /api/challenge/score so
// both endpoints always use the same prompt. Output is normalized via the
// shared `normalizeLlmScoreOutput` helper, which accepts both the legacy
// 4-subscore shape and the simpler `{ score, confidence, top3issues,
// summary }` shape.

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

// ───────────────────────── narrative (parallel call #2) ────────────────────────

const reportSchema = z.object({
  headline: z.string().max(300),
  thread: z.string().max(800),
  pillars: z
    .array(
      z.object({
        key: z.enum([
          "directionClarity",
          "identityAlignment",
          "decisionReadiness",
          "energyAlignment",
        ]),
        narrative: z.string().max(1200),
        evidence: z.string().max(400),
        focus: z.string().max(400),
      })
    )
    .length(4),
  themes: z
    .array(
      z.object({
        title: z.string().max(120),
        body: z.string().max(800),
      })
    )
    .min(1)
    .max(4),
  beats: z
    .array(
      z.object({
        n: z.number().int().min(1).max(5),
        title: z.string().max(120),
        quote: z.string().max(500),
        reflection: z.string().max(500),
      })
    )
    .length(5),
  takeaways: z
    .array(
      z.object({
        title: z.string().max(120),
        body: z.string().max(600),
        urgency: z.enum(["now", "week", "month"]),
      })
    )
    .min(2)
    .max(6),
  thirtyDay: z.string().max(600),
})

function applyReportUserTemplate(
  template: string,
  firstName: string,
  r: z.infer<typeof bodySchema>["responses"],
  b: z.infer<typeof bodySchema>["beats"]
): string {
  const name = sanitizeForPrompt((firstName || "").trim()) || "the user"
  const blank = "(left blank)"
  return template
    .replace(/\{\{NAME\}\}/g, name)
    .replace(/\{\{Q1\}\}/g, sanitizeForPrompt(r.question1?.trim() || blank))
    .replace(/\{\{Q2\}\}/g, sanitizeForPrompt(r.question2?.trim() || blank))
    .replace(/\{\{Q3\}\}/g, sanitizeForPrompt(r.question3?.trim() || blank))
    .replace(/\{\{Q4\}\}/g, sanitizeForPrompt(r.question4?.trim() || blank))
    .replace(/\{\{Q5\}\}/g, sanitizeForPrompt(r.question5?.trim() || blank))
    .replace(/\{\{BEAT1\}\}/g, sanitizeForPrompt(b.beat1?.trim() || blank))
    .replace(/\{\{BEAT2\}\}/g, sanitizeForPrompt(b.beat2?.trim() || blank))
    .replace(/\{\{BEAT3\}\}/g, sanitizeForPrompt(b.beat3?.trim() || blank))
    .replace(/\{\{BEAT4\}\}/g, sanitizeForPrompt(b.beat4?.trim() || blank))
    .replace(/\{\{BEAT5\}\}/g, sanitizeForPrompt(b.beat5?.trim() || blank))
}

// ───────────────────────── shared helpers ─────────────────────────

function extractJsonObject(raw: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) return fenced[1].trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  return trimmed.slice(start, end + 1)
}

async function callOpenRouter(opts: {
  apiKey: string
  model: string
  referer: string
  title: string
  system: string
  user: string
  temperature: number
  maxTokens: number
}): Promise<string | null> {
  let upstream: Response
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": opts.referer,
        "X-Title": opts.title,
      },
      body: JSON.stringify({
        model: opts.model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        stream: false,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        response_format: { type: "json_object" },
      }),
    })
  } catch (e) {
    console.error("[report] upstream fetch", redactError(e))
    return null
  }
  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "")
    console.error("[report] upstream", upstream.status, errText.slice(0, 400))
    return null
  }
  let upstreamJson: unknown
  try {
    upstreamJson = await upstream.json()
  } catch (e) {
    console.error("[report] upstream JSON parse", redactError(e))
    return null
  }
  const content: unknown = (
    upstreamJson as { choices?: Array<{ message?: { content?: unknown } }> }
  )?.choices?.[0]?.message?.content
  return typeof content === "string" ? content : null
}

// ───────────────────────── handler ─────────────────────────

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
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

  const { firstName, responses, beats, precomputedScore, audience } = parsed.data

  const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini"
  const referer =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://localhost:3000"

  // Fetch every admin-configurable prompt up front. They come from the same
  // Cosmos cache so the additional reads are free. The score prompts are
  // only needed when we don't have a precomputed score.
  const [reportSystem, reportUserTemplate, scoreSystem, scoreUserTemplate] =
    await Promise.all([
      getReportSystemPrompt(audience, DEFAULT_REPORT_SYSTEM_PROMPT),
      getReportUserPromptTemplate(audience, DEFAULT_REPORT_USER_PROMPT),
      precomputedScore
        ? Promise.resolve("")
        : getScoreSystemPrompt(audience, DEFAULT_SCORE_SYSTEM_PROMPT),
      precomputedScore
        ? Promise.resolve("")
        : getScoreUserPromptTemplate(audience, DEFAULT_SCORE_USER_PROMPT),
    ])

  // If the caller already has a score (from the clarity-score page), reuse
  // it and skip the second LLM scoring call entirely. Otherwise run scoring
  // and narrative in parallel - total latency = max(score, report).
  const reportPromise = callOpenRouter({
    apiKey,
    model,
    referer,
    title: "Honest Decision Challenge - Report Narrative",
    system: reportSystem,
    user: applyReportUserTemplate(reportUserTemplate, firstName, responses, beats),
    temperature: 0.55,
    maxTokens: 2400,
  })

  const scorePromise: Promise<string | null> = precomputedScore
    ? Promise.resolve(null)
    : callOpenRouter({
        apiKey,
        model,
        referer,
        title: "Honest Decision Challenge - Report Score",
        system: scoreSystem,
        user: applyScoreUserTemplate(scoreUserTemplate, firstName, responses),
        temperature: 0.2,
        maxTokens: 700,
      })

  const [scoreRaw, reportRaw] = await Promise.all([scorePromise, reportPromise])

  // ── resolve score: prefer precomputed → LLM → heuristic fallback ──
  let clarity: ClarityScore
  let reasons:
    | Record<keyof Subscores, string>
    | Record<string, string | undefined>
    | Record<string, never> = {}
  let nsState: string | undefined = undefined
  let scoreSource: "llm" | "fallback" = "fallback"

  if (precomputedScore) {
    clarity = buildClarityScoreFromSubscores(precomputedScore.subscores)
    reasons = precomputedScore.reasons ?? {}
    nsState = precomputedScore.nsState
    scoreSource = "llm"
  } else if (scoreRaw) {
    const jsonStr = extractJsonObject(scoreRaw)
    if (jsonStr) {
      try {
        const obj: unknown = JSON.parse(jsonStr)
        // Use the shared normalizer so this route accepts the same set of
        // LLM output shapes as /api/challenge/score (legacy 4-subscore OR
        // simple-eval { score: 1-10, ... }). Both routes therefore stay in
        // sync with whatever shape the admin's Score prompt produces.
        const norm = normalizeLlmScoreOutput(obj)
        if (norm) {
          clarity = buildClarityScoreFromSubscores(norm.subscores)
          reasons = norm.reasons ?? {}
          nsState = norm.nsState
          scoreSource = "llm"
        } else {
          clarity = scoreClarity(responses)
        }
      } catch {
        clarity = scoreClarity(responses)
      }
    } else {
      clarity = scoreClarity(responses)
    }
  } else {
    clarity = scoreClarity(responses)
  }

  // ── parse narrative (this one is required - if missing, return 502) ──
  if (!reportRaw) {
    return new Response(
      JSON.stringify({ error: "Report generation failed" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }
  const reportJsonStr = extractJsonObject(reportRaw)
  if (!reportJsonStr) {
    return new Response(
      JSON.stringify({ error: "Report model returned no JSON" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }
  let reportObj: unknown
  try {
    reportObj = JSON.parse(reportJsonStr)
  } catch (e) {
    console.error("[report] JSON.parse failed", redactError(e))
    return new Response(
      JSON.stringify({ error: "Report model returned invalid JSON" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }
  const reportValidated = reportSchema.safeParse(reportObj)
  if (!reportValidated.success) {
    console.error(
      "[report] schema validation failed",
      reportValidated.error.flatten()
    )
    return new Response(
      JSON.stringify({
        error: "Report response did not match schema",
        details: reportValidated.error.flatten(),
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }

  return new Response(
    JSON.stringify({
      clarity,
      reasons,
      nsState,
      report: reportValidated.data,
      scoreSource,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  )
}
