import { redactError } from "@/lib/security"
import { z } from "zod"

/**
 * Clarity Readiness scoring — LLM-backed.
 *
 * Given the user's five raw responses, asks the model to score them against
 * the rubric from the scoring spec and return strict JSON:
 *
 *   {
 *     subscores: { directionClarity, identityAlignment, decisionReadiness, energyAlignment },
 *     reasons:   { directionClarity, identityAlignment, decisionReadiness, energyAlignment },
 *     nsState:   "REGULATED" | "ACTIVATED" | "COLLAPSED" | "IDENTITY-ROOT" | "PURPOSE-ROOT" | "UNKNOWN"
 *   }
 *
 * Each subscore is 0–100 (normal direction — higher = better). The reasons
 * are one short sentence each, grounded in the user's actual language.
 */

const bodySchema = z.object({
  firstName: z.string().max(200).optional().default(""),
  responses: z.object({
    question1: z.string().max(50000).optional().default(""),
    question2: z.string().max(50000).optional().default(""),
    question3: z.string().max(50000).optional().default(""),
    question4: z.string().max(50000).optional().default(""),
    question5: z.string().max(50000).optional().default(""),
  }),
})

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

const SYSTEM_PROMPT = `You are the scoring engine for the Clarity Readiness Index — the assessment taken by senior leaders (founders, CEOs, advisors, executives) who are carrying an unresolved situation they cannot yet name precisely enough to act on.

You will receive the five raw answers the user gave during a reflection journey. Your job is to read them against the rubric below and return FOUR subscores, each an integer 0–100.

All four subscores are NORMAL DIRECTION — higher means clearer / more aligned / more ready. Nothing is inverted.

═══════════════════════════════════════════════════════════
THE FOUR SUBSCORES
═══════════════════════════════════════════════════════════

1. DIRECTION CLARITY (pillar: Purpose)
   Measures: how clearly defined the person's sense of direction is.

   HIGH (65–85): A clear direction is named or strongly implied in Q4/Q5. Desire language present ("I want to", "what matters to me", "I'd love") alongside analysis. Q5 is specific and operational — the morning-after scene has texture and named actions.
   MODERATE (45–64): Direction is forming. Some desire language, some obligation language. Q5 has form but lacks operational specificity.
   LOW (25–44): Language circles — the same point is restated differently across Q1 and Q2. Obligation language dominates ("I should", "I need to", "I have to"). "I don't know" / "I'm not sure" appears multiple times. Cannot name what the resolved version looks and feels like.
   VERY LOW (<25): No direction detectable. Pure stuckness, pure analysis, or pure avoidance of the question.

2. IDENTITY ALIGNMENT (pillar: Identity)
   Measures: how congruent the person's self-sense is with where they are going.

   HIGH (60–80): Self-reference without excessive justification. Honest vulnerability in Q2 WITHOUT self-criticism. Regulated tone — genuine self-awareness. The person speaks from inside themselves, not from a role or a performance of themselves.
   MODERATE (40–59): Some self-awareness, some performance. Mixed signals.
   LOW (25–39): Performance language dominant ("I am normally...", "usually I...", "typically I", "people expect me to..."). Over-justification of decisions. Self-comparison. Self-worth tied to having the answer. An IDENTITY-ROOT pattern is detectable — the real block is about who they think they have to be.
   VERY LOW (<25): Heavy self-criticism, disowning language, or complete detachment from self.

3. DECISION READINESS (pillar: Peace of Mind)
   Measures: how ready they are to make and hold the decision that moves this forward.

   HIGH (65–85): In Q4 they can name the specific conditions / the specific thing that moved it last time — and that naming has weight. Q2 shows genuine readiness to face what's keeping it stuck. The narrative is coherent across the five answers — not looping.
   MODERATE (40–64): The concern is named but the specific next move is still fuzzy. Some looping between Q1 and Q2.
   LOW (20–39): The same core concern is restated 3+ times in different forms across the questions. Activated nervous system without direction. Q2 shows complete avoidance of the real reason. COLLAPSED state possible.
   VERY LOW (<20): Nothing actionable anywhere. Pure rumination.

4. ENERGY ALIGNMENT (pillar: Embodiment)
   Measures: whether they are operating from genuine drive vs obligation.

   HIGH (55–75): Body language present in Q3 (where the tension lives, physical signals named — chest, stomach, tight, heavy, tired, energy, breath). Q5 includes sensory / physical detail — what they SEE, FEEL, hear in that morning. Q4 shows desire-based motivation, not just obligation.
   MODERATE (35–54): Occasional somatic language. Q5 has some sensory detail. Q4 mixes desire and obligation.
   LOW (20–34): Entirely cognitive throughout — no body references in any answer. Q3 describes cost but only intellectually. Q4 is obligation-based (what they should do, what others expect).
   VERY LOW (<20): Flat, detached, disembodied. Zero felt-sense across all five answers.

═══════════════════════════════════════════════════════════
CALIBRATION ANCHORS
═══════════════════════════════════════════════════════════

Audience mean is 48/100 overall. This audience is senior leaders, already self-aware, but carrying something unresolved. Score conservatively:
- Most real answers land between 30 and 65 on any given subscore.
- Reserve 75+ for answers that actually demonstrate the HIGH markers above — not just any decent answer.
- Reserve <25 only for answers that truly demonstrate the VERY LOW markers.
- Short/thin answers (a sentence or two) should generally score 25–40 — there isn't enough signal to justify higher.
- Long, articulate, thoughtful answers that still LOOP or AVOID should still score LOW — verbosity is not clarity.

═══════════════════════════════════════════════════════════
ADDITIONAL DETECTION — nsState
═══════════════════════════════════════════════════════════

Also classify the nervous-system state evidenced across the answers:
- "REGULATED": grounded, self-aware, can sit with what is
- "ACTIVATED": urgent, pressured, racing, many should/need-to markers
- "COLLAPSED": flat, hopeless, looping, detached
- "IDENTITY-ROOT": the real knot is a question of who they think they have to be (identity pillar dominant)
- "PURPOSE-ROOT": the real knot is a question of what actually matters to them (purpose pillar dominant)
- "UNKNOWN": not enough signal

═══════════════════════════════════════════════════════════
OUTPUT FORMAT (STRICT — JSON ONLY)
═══════════════════════════════════════════════════════════

Return ONLY a single JSON object, no prose, no code fence, matching exactly:

{
  "subscores": {
    "directionClarity":   <integer 0-100>,
    "identityAlignment":  <integer 0-100>,
    "decisionReadiness":  <integer 0-100>,
    "energyAlignment":    <integer 0-100>
  },
  "reasons": {
    "directionClarity":   "<one short sentence, grounded in their actual words>",
    "identityAlignment":  "<one short sentence, grounded in their actual words>",
    "decisionReadiness":  "<one short sentence, grounded in their actual words>",
    "energyAlignment":    "<one short sentence, grounded in their actual words>"
  },
  "nsState": "REGULATED" | "ACTIVATED" | "COLLAPSED" | "IDENTITY-ROOT" | "PURPOSE-ROOT" | "UNKNOWN"
}

Each reason MUST reference something specific the user actually wrote. Do not generalize. Do not flatter. Do not add fields. Integers only for the scores.`

function buildUserPrompt(
  firstName: string,
  r: z.infer<typeof bodySchema>["responses"]
): string {
  const name = (firstName || "").trim() || "The user"
  const blank = "(left blank)"
  return `${name} just completed the Clarity Readiness reflection. Here are the FIVE RAW ANSWERS they wrote. Score them against the rubric.

═══ Q1 — The Present / what's not moving the way it should ═══
${r.question1?.trim() || blank}

═══ Q2 — The Direction / what would be different in 12 months ═══
${r.question2?.trim() || blank}

═══ Q3 — The Noise / what keeps pulling at their attention ═══
${r.question3?.trim() || blank}

═══ Q4 — The Pattern / what was true the last time something clicked ═══
${r.question4?.trim() || blank}

═══ Q5 — The Clarity / the morning-after scene when the noise is gone ═══
${r.question5?.trim() || blank}

Return ONLY the JSON object. No preamble. No code fences.`
}

// ---------- response validation ----------

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
  nsState: z.enum([
    "REGULATED",
    "ACTIVATED",
    "COLLAPSED",
    "IDENTITY-ROOT",
    "PURPOSE-ROOT",
    "UNKNOWN",
  ]),
})

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

  const { firstName, responses } = parsed.data
  const userPrompt = buildUserPrompt(firstName, responses)

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
          { role: "system", content: SYSTEM_PROMPT },
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

  const validated = scoreResponseSchema.safeParse(modelOutput)
  if (!validated.success) {
    console.error(
      "[score] schema validation failed",
      validated.error.flatten()
    )
    return new Response(
      JSON.stringify({
        error: "Model response did not match schema",
        details: validated.error.flatten(),
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }

  return new Response(JSON.stringify(validated.data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  })
}
