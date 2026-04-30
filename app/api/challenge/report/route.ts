import { redactError } from "@/lib/security"
import { z } from "zod"
import {
  buildClarityScoreFromSubscores,
  scoreClarity,
  type ClarityScore,
  type Subscores,
} from "@/lib/scoring"

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

const SCORE_SYSTEM_PROMPT = `You are the scoring engine for the Clarity Readiness Index. Read the five raw answers and return FOUR subscores 0–100 (higher = clearer / more aligned / more ready) plus one short reason for each grounded in the user's actual words, plus an nervous-system state.

Audience mean is 48/100. Most real answers land 30–65. Reserve 75+ for answers that demonstrably show high direction, ownership, decision-readiness, or embodied energy. Reserve <25 for clear stuckness.

Return ONLY this JSON:
{
  "subscores": { "directionClarity": int, "identityAlignment": int, "decisionReadiness": int, "energyAlignment": int },
  "reasons":   { "directionClarity": str,  "identityAlignment": str,  "decisionReadiness": str,  "energyAlignment": str  },
  "nsState":   "REGULATED" | "ACTIVATED" | "COLLAPSED" | "IDENTITY-ROOT" | "PURPOSE-ROOT" | "UNKNOWN"
}`

const scoreResponseSchema = z.object({
  subscores: z.object({
    directionClarity: z.number().int().min(0).max(100),
    identityAlignment: z.number().int().min(0).max(100),
    decisionReadiness: z.number().int().min(0).max(100),
    energyAlignment: z.number().int().min(0).max(100),
  }),
  reasons: z.object({
    directionClarity: z.string().max(500),
    identityAlignment: z.string().max(500),
    decisionReadiness: z.string().max(500),
    energyAlignment: z.string().max(500),
  }),
  nsState: z
    .enum([
      "REGULATED",
      "ACTIVATED",
      "COLLAPSED",
      "IDENTITY-ROOT",
      "PURPOSE-ROOT",
      "UNKNOWN",
    ])
    .optional(),
})

function buildScoreUserPrompt(
  firstName: string,
  r: z.infer<typeof bodySchema>["responses"]
): string {
  const name = (firstName || "").trim() || "The user"
  const blank = "(left blank)"
  return `${name} just completed the Clarity Readiness reflection.

Q1 — what's not moving the way it should:
${r.question1?.trim() || blank}

Q2 — what would be different in 12 months:
${r.question2?.trim() || blank}

Q3 — what keeps pulling at their attention:
${r.question3?.trim() || blank}

Q4 — what was true the last time something clicked:
${r.question4?.trim() || blank}

Q5 — the morning-after scene when the noise is gone:
${r.question5?.trim() || blank}

Return ONLY the JSON object.`
}

// ───────────────────────── narrative (parallel call #2) ────────────────────────

const REPORT_SYSTEM_PROMPT = `You are a deeply perceptive guide writing a personalized Clarity Readiness Report for a senior leader who just completed a five-beat reflection journey. Your role is to synthesize what surfaced into a printable report — not a summary, but a mirror.

Tone: warm, direct, unhurried. No buzzwords, no motivational language, no therapy-speak. Short, meaningful sentences. You trust silence. You never exaggerate. You write specifically for THIS person — every line must feel grounded in what they actually wrote.

You will receive both the user's RAW ANSWERS (Q1–Q5) and the AI-generated CLOSING BEATS (beat1–beat5) from earlier in the journey.

Return ONLY this JSON shape, no prose, no code fences:

{
  "headline":   "<one sharp sentence — the thesis of their journey, max 14 words>",
  "thread":     "<2–3 sentences naming the throughline running through everything they wrote>",
  "pillars": [
    { "key": "directionClarity",  "narrative": "<60–90 words on what their direction-clarity reading actually means for them, grounded in their words>", "evidence": "<short direct quote or close paraphrase from their answers, max 120 chars>", "focus": "<one-sentence imperative — the specific lever for this pillar>" },
    { "key": "identityAlignment", "narrative": "<60–90 words…>", "evidence": "<…>", "focus": "<…>" },
    { "key": "decisionReadiness", "narrative": "<60–90 words…>", "evidence": "<…>", "focus": "<…>" },
    { "key": "energyAlignment",   "narrative": "<60–90 words…>", "evidence": "<…>", "focus": "<…>" }
  ],
  "themes": [
    { "title": "<3–6 word theme name>", "body": "<2–3 sentences on this theme as it appears in their words>" },
    { "title": "<3–6 word theme name>", "body": "<2–3 sentences>" }
  ],
  "beats": [
    { "n": 1, "title": "<3–5 word framing for this beat>", "quote": "<the strongest 1-sentence line from beat1, lightly tightened, max 200 chars>", "reflection": "<1 sentence reflecting back what this beat reveals>" },
    { "n": 2, "title": "<…>", "quote": "<…>", "reflection": "<…>" },
    { "n": 3, "title": "<…>", "quote": "<…>", "reflection": "<…>" },
    { "n": 4, "title": "<…>", "quote": "<…>", "reflection": "<…>" },
    { "n": 5, "title": "<…>", "quote": "<…>", "reflection": "<…>" }
  ],
  "takeaways": [
    { "title": "<≤6 words>", "body": "<1–2 sentences — a concrete move, specific to their situation>", "urgency": "now" | "week" | "month" },
    { "title": "<…>", "body": "<…>", "urgency": "now" | "week" | "month" },
    { "title": "<…>", "body": "<…>", "urgency": "now" | "week" | "month" },
    { "title": "<…>", "body": "<…>", "urgency": "now" | "week" | "month" }
  ],
  "thirtyDay": "<1–2 sentences — what to look for / re-measure 30 days from now>"
}

Constraints:
- Every quote/evidence MUST be drawn from the user's actual writing. If a beat is empty, derive it from the matching raw answer.
- Do NOT use the user's name more than once across the entire report.
- Each pillar narrative MUST reference at least one specific thing they said.
- Takeaways must be concrete and tailored — never generic ("be intentional", "trust yourself" are banned).
- Output ONLY the JSON object. No preamble. No markdown.`

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

function buildReportUserPrompt(
  firstName: string,
  r: z.infer<typeof bodySchema>["responses"],
  b: z.infer<typeof bodySchema>["beats"]
): string {
  const name = (firstName || "").trim() || "the user"
  const blank = "(left blank)"
  return `Write the personalized Clarity Readiness Report for ${name}, based on the following.

═════ RAW ANSWERS ═════

Q1 — what's not moving the way it should:
${r.question1?.trim() || blank}

Q2 — what would be different in 12 months:
${r.question2?.trim() || blank}

Q3 — what keeps pulling at their attention:
${r.question3?.trim() || blank}

Q4 — what was true the last time something clicked:
${r.question4?.trim() || blank}

Q5 — the morning-after scene when the noise is gone:
${r.question5?.trim() || blank}

═════ CLOSING BEATS (AI-generated reflections from earlier) ═════

Beat 1 — The Pattern:
${b.beat1?.trim() || blank}

Beat 2 — The Desired Future:
${b.beat2?.trim() || blank}

Beat 3 — The Noise:
${b.beat3?.trim() || blank}

Beat 4 — The Breakthrough Moment:
${b.beat4?.trim() || blank}

Beat 5 — The Morning After Clarity:
${b.beat5?.trim() || blank}

Return ONLY the JSON object.`
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

  const { firstName, responses, beats, precomputedScore } = parsed.data

  const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini"
  const referer =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://localhost:3000"

  // If the caller already has a score (from the clarity-score page), reuse
  // it and skip the second LLM scoring call entirely. Otherwise run scoring
  // and narrative in parallel — total latency = max(score, report).
  const reportPromise = callOpenRouter({
    apiKey,
    model,
    referer,
    title: "Honest Decision Challenge - Report Narrative",
    system: REPORT_SYSTEM_PROMPT,
    user: buildReportUserPrompt(firstName, responses, beats),
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
        system: SCORE_SYSTEM_PROMPT,
        user: buildScoreUserPrompt(firstName, responses),
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
        const v = scoreResponseSchema.safeParse(obj)
        if (v.success) {
          clarity = buildClarityScoreFromSubscores(v.data.subscores)
          reasons = v.data.reasons
          nsState = v.data.nsState
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

  // ── parse narrative (this one is required — if missing, return 502) ──
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
