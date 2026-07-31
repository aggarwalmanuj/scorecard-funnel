import { redactError, sanitizeForPrompt } from "@/lib/security"
import { DEFAULT_VERTICAL, normalizeVertical } from "@/lib/verticals"
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
  audience: z
    .string()
    .optional()
    .transform((v) => normalizeVertical(v) ?? DEFAULT_VERTICAL),
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
  // Six-page Action Plan extension. Optional: prompts predating the
  // expansion (and admin overrides not yet updated) must keep validating.
  evidenceLog: z
    .object({
      instruction: z.string().max(600).optional(),
      columns: z.array(z.string().max(120)).min(2).max(6).optional(),
      seeded: z
        .object({
          situation: z.string().max(400),
          oldStory: z.string().max(400),
          whatIDid: z.string().max(400),
          whatHappened: z.string().max(400),
        })
        .optional(),
    })
    .optional(),
  // Funnel v2 tool fields (BUILD-Sahil-Funnel-v2) - all optional.
  scoreFraming: z.string().max(400).optional(),
  startHere: z.string().max(400).optional(),
  firstMove: z
    .object({
      line: z.string().max(300),
      instruction: z.string().max(800),
    })
    .optional(),
  dailyLine: z.string().max(300).optional(),
  shareableLine: z.string().max(400).optional(),
  lockScreenLine: z.string().max(300).optional(),
  rhythm: z.array(z.string().max(400)).min(1).max(4).optional(),
  openingPassage: z.string().max(2000).optional(),
  companions: z
    .object({
      allyNote: z.string().max(1500),
      pocketLine: z.string().max(300),
      patternVocabulary: z
        .array(
          z.object({
            phrase: z.string().max(300),
            meaning: z.string().max(400),
          })
        )
        .min(1)
        .max(5),
    })
    .optional(),
})

function applyReportUserTemplate(
  template: string,
  firstName: string,
  r: z.infer<typeof bodySchema>["responses"],
  b: z.infer<typeof bodySchema>["beats"],
  subscores?: {
    directionClarity: number
    identityAlignment: number
    decisionReadiness: number
    energyAlignment: number
  }
): string {
  const name = sanitizeForPrompt((firstName || "").trim()) || "the user"
  const blank = "(left blank)"
  // Funnel v2: the prompt orders pillars by leverage using the four
  // subscores. Available whenever the funnel passes its precomputed score
  // (the normal path); otherwise the model is told they're unavailable and
  // the plan still renders - only "start here" accuracy depends on them.
  const s = (v: number | undefined) =>
    typeof v === "number" ? String(v) : "(not available)"
  return template
    .replace(/\{\{SCORE_DIRECTION\}\}/g, s(subscores?.directionClarity))
    .replace(/\{\{SCORE_IDENTITY\}\}/g, s(subscores?.identityAlignment))
    .replace(/\{\{SCORE_DECISION\}\}/g, s(subscores?.decisionReadiness))
    .replace(/\{\{SCORE_ENERGY\}\}/g, s(subscores?.energyAlignment))
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
    title: "Belief Score - Report Narrative",
    system: reportSystem,
    user: applyReportUserTemplate(
      reportUserTemplate,
      firstName,
      responses,
      beats,
      precomputedScore?.subscores,
    ),
    temperature: 0.55,
    // The report is the PAID deliverable and the longest JSON the funnel
    // generates. At 2400 a richer per-vertical prompt (healthcare's, for
    // one) overruns the budget, the JSON is truncated mid-string, parsing
    // fails and the buyer receives NOTHING. Headroom is far cheaper than a
    // failed delivery.
    maxTokens: 4000,
  })

  const scorePromise: Promise<string | null> = precomputedScore
    ? Promise.resolve(null)
    : callOpenRouter({
        apiKey,
        model,
        referer,
        title: "Belief Score - Report Score",
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
  //
  // One retry before failing. This is the paid deliverable: a single
  // malformed or truncated response used to mean the buyer received no
  // report at all (observed in production on the healthcare vertical,
  // whose longer prompt overran the old token ceiling). A retry costs one
  // extra model call; a failed delivery costs the sale and the trust.
  const parseReport = (raw: string | null): unknown | null => {
    if (!raw) return null
    const jsonStr = extractJsonObject(raw)
    if (!jsonStr) return null
    try {
      return JSON.parse(jsonStr)
    } catch {
      return null
    }
  }

  let reportObj = parseReport(reportRaw)
  if (reportObj === null) {
    console.warn("[report] first attempt unparseable - retrying once")
    const retryRaw = await callOpenRouter({
      apiKey,
      model,
      referer,
      title: "Belief Score - Report Narrative (retry)",
      system: reportSystem,
      user: applyReportUserTemplate(
        reportUserTemplate,
        firstName,
        responses,
        beats,
        precomputedScore?.subscores,
      ),
      // Lower temperature on the retry: the first pass already failed to
      // hold the format, so favour determinism over voice.
      temperature: 0.3,
      maxTokens: 4000,
    })
    reportObj = parseReport(retryRaw)
  }

  if (reportObj === null) {
    // Log the shape of the failure, not the content. A raw length at/near
    // the token ceiling with no closing brace means TRUNCATION (raise
    // maxTokens or shorten that vertical's report prompt) - the single most
    // likely cause, since the call already pins response_format to
    // json_object, which otherwise guarantees syntactically valid JSON.
    const len = reportRaw?.length ?? 0
    const endsClosed = (reportRaw ?? "").trimEnd().endsWith("}")
    console.error(
      `[report] unparseable after retry | audience=${audience} rawChars=${len} endsWithBrace=${endsClosed} (false => truncated)`
    )
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
