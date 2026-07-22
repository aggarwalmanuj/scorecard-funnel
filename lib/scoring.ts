/**
 * Clarity Readiness scoring engine.
 *
 * Pure, deterministic, client-safe. Given the five question responses,
 * produces four subscores and an overall 0–100 score, using the
 * linguistic-signal heuristics described in the scoring spec.
 *
 * Subscore weights (sum = 1):
 *   - Direction Clarity   0.35
 *   - Identity Alignment  0.25
 *   - Decision Readiness  0.25
 *   - Energy Alignment    0.15
 *
 * All subscores are normal direction (higher = better).
 *
 * Audience mean (initial estimate): 48. Subscore means:
 *   Direction 46, Identity 50, Decision 48, Energy 52.
 */

export type Responses = {
  question1: string
  question2: string
  question3: string
  question4: string
  question5: string
}

export type Subscores = {
  directionClarity: number
  identityAlignment: number
  decisionReadiness: number
  energyAlignment: number
}

export type ClarityBand =
  | "high"
  | "good"
  | "moderate"
  | "significant-gaps"
  | "deep-stuck"

export interface ClarityScore {
  overall: number
  subscores: Subscores
  band: ClarityBand
  bandLabel: string
  bandMessage: string
  benchmarkMean: number
  comparisonLabel: string
  subscoreDetails: {
    key: keyof Subscores
    label: string
    pillar: string
    weight: number
    value: number
  }[]
}

export const SUBSCORE_WEIGHTS: Record<keyof Subscores, number> = {
  directionClarity: 0.35,
  identityAlignment: 0.25,
  decisionReadiness: 0.25,
  energyAlignment: 0.15,
}

export const BENCHMARK_MEAN = 48

// ---------- helpers ----------

const norm = (s: string | undefined | null): string =>
  (s ?? "").toLowerCase().replace(/\s+/g, " ").trim()

const countMatches = (text: string, re: RegExp): number =>
  (text.match(re) ?? []).length

const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n))

function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .split(/\W+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 3)
    )
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  ta.forEach((w) => {
    if (tb.has(w)) inter++
  })
  const union = ta.size + tb.size - inter
  return union === 0 ? 0 : inter / union
}

// ---------- subscore computations ----------

function computeDirectionClarity(q: Responses): number {
  const all = [q.question1, q.question2, q.question3, q.question4, q.question5]
    .map(norm)
    .join(" ")
  const q1 = norm(q.question1)
  const q2 = norm(q.question2)
  const q5 = norm(q.question5)

  // Desire / intentional direction language (positive)
  const desire = countMatches(
    all,
    /\bi want\b|\bi'd love\b|\bi wish\b|\bi'm ready\b|what matters to me|what i care about|what i value/gi
  )
  // Obligation language (negative - "should/need to")
  const obligation = countMatches(
    all,
    /\bi should\b|\bi need to\b|\bi have to\b|\bi must\b|\bi'm supposed to\b|expected of me|supposed to be/gi
  )
  // "I don't know" markers (negative)
  const idk = countMatches(
    all,
    /\bi don'?t know\b|\bi'?m not sure\b|\bnot clear\b|\bunclear\b|\bcan'?t tell\b|\bno idea\b/gi
  )
  // Circling - Q1 and Q2 restating the same point
  const q1q2Sim = jaccardSimilarity(q1, q2)
  // Q5 operational specificity
  const q5Operational =
    /\b(next|first|step|today|tomorrow|this week|by (monday|tuesday|wednesday|thursday|friday)|will|going to|i'?ll|i choose|start|begin|call|send|say|tell|ask|book|commit)\b/i.test(
      q5
    )
  const q5Length = q5.length

  let score = 50
  score += Math.min(22, desire * 6)
  score -= Math.min(16, obligation * 5)
  score -= Math.min(18, idk * 7)
  score -= q1q2Sim > 0.55 ? 14 : q1q2Sim > 0.4 ? 8 : 0
  score += q5Operational ? 10 : -6
  score += q5Length > 120 ? 6 : q5Length > 60 ? 3 : q5Length > 15 ? 0 : -6

  return clamp(Math.round(score), 18, 92)
}

function computeIdentityAlignment(q: Responses): number {
  const all = [q.question1, q.question2, q.question3, q.question4, q.question5]
    .map(norm)
    .join(" ")
  const q2 = norm(q.question2)

  // Performance language (negative)
  const performance = countMatches(
    all,
    /\busually i\b|\bnormally i\b|\bi am normally\b|\bi'm normally\b|\btypically i\b|\bi'm usually\b|people expect me|everyone thinks|they'?d say/gi
  )
  // Self-critical / comparison (negative)
  const selfCritical = countMatches(
    all,
    /\bi'm bad at\b|\bi'm weak\b|\bi failed\b|\bnot good enough\b|\bi should be\b|\bi'm the one who\b|\bit's my fault\b|\beveryone else\b/gi
  )
  // Honest vulnerability markers in Q2 (positive)
  const honestVuln =
    /\bafraid\b|\bscared\b|\bhonestly\b|\btruth is\b|\bashamed\b|\bconfused\b|\bembarrassed\b|\btired of\b|\bi don'?t want to\b/i.test(
      q2
    )
  // Self-reference density in Q2 - a moderate "I" count signals ownership;
  // zero (detached) or extreme (rumination) both reduce the signal.
  const iCount = countMatches(q2, /\bi\b/gi)
  const q2Len = q2.length

  let score = 52
  score -= Math.min(20, performance * 6)
  score -= Math.min(15, selfCritical * 5)
  score += honestVuln ? 12 : 0
  if (q2Len > 40) {
    if (iCount >= 3 && iCount <= 12) score += 6
    else if (iCount > 15) score -= 4
    else if (iCount === 0) score -= 6
  } else {
    score -= 4 // too thin to assess
  }

  return clamp(Math.round(score), 18, 85)
}

function computeDecisionReadiness(q: Responses): number {
  const all = [q.question1, q.question2, q.question3, q.question4, q.question5]
    .map(norm)
    .join(" ")
  const q1 = norm(q.question1)
  const q2 = norm(q.question2)
  const q4 = norm(q.question4)

  // Q4 names a concrete, specific move (positive)
  const q4SpecificMove =
    /\b(call|tell|say|meet|send|schedule|start|stop|quit|leave|commit|decide|choose|book|write|finish|launch|hire|fire|ask for|sign|post|publish|ship)\b/i.test(
      q4
    )
  // Readiness / commitment language across all answers (positive)
  const readinessLang = countMatches(
    all,
    /\bready\b|\bi'?ll\b|\bi will\b|\bi'?m going to\b|\bi choose\b|\blet me\b|\bdone with\b|\bfinished with\b|\bno more\b/gi
  )
  // Avoidance markers in Q2 (negative)
  const q2Avoid = countMatches(
    q2,
    /\bi don'?t know\b|\bnot sure\b|\bmaybe\b|\bmight\b|\bkind of\b|\bsort of\b/gi
  )
  // Looping - Q1 core restated in Q2 (negative)
  const looping = jaccardSimilarity(q1, q2)

  let score = 48
  score += q4SpecificMove ? 18 : -10
  score += Math.min(10, readinessLang * 3)
  score -= Math.min(14, q2Avoid * 4)
  score -= looping > 0.55 ? 12 : looping > 0.4 ? 6 : 0

  return clamp(Math.round(score), 15, 90)
}

function computeEnergyAlignment(q: Responses): number {
  const all = [q.question1, q.question2, q.question3, q.question4, q.question5]
    .map(norm)
    .join(" ")
  const q3 = norm(q.question3)
  const q4 = norm(q.question4)
  const q5 = norm(q.question5)

  // Body / somatic language
  const bodyRe =
    /\b(chest|stomach|body|heart|shoulders|throat|gut|jaw|spine|belly|breath|breathing|tight|tension|heavy|tired|exhausted|drained|alive|energy|electric|buzz|warm|cold|spark|ache|pressure|knot|clench|flutter)\b/gi
  const bodyTotal = countMatches(all, bodyRe)
  const bodyInQ3 = countMatches(q3, bodyRe) > 0
  // Sensory / felt-sense in Q5
  const sensoryQ5 =
    /\b(feel|feels|see|hear|smell|taste|bright|quiet|still|calm|soft|warm|cold|light|heavy|grounded|steady|open|free)\b/i.test(
      q5
    )
  // Q4 obligation-based motivation (negative for energy alignment)
  const q4Obligation =
    /\b(should|have to|need to|expected|supposed to|must)\b/i.test(q4)
  // Q4 desire-based motivation (positive)
  const q4Desire =
    /\b(want|love|choose|ready|call(ing)? me|alive|drawn to|pulled toward)\b/i.test(
      q4
    )

  let score = 40
  score += Math.min(22, bodyTotal * 4)
  score += bodyInQ3 ? 6 : -4
  score += sensoryQ5 ? 10 : 0
  score -= q4Obligation ? 10 : 0
  score += q4Desire ? 8 : 0

  return clamp(Math.round(score), 15, 82)
}

// ---------- bands / display ----------

// Leverage framing, not deficit framing (Funnel v2 build doc): the buyer
// should read their number as room to move, never as a grade. Band ids are
// kept stable (they drive accent colors); only thresholds + copy changed.
// "deep-stuck" is intentionally no longer emitted.
function bandFor(overall: number): {
  band: ClarityBand
  bandLabel: string
  bandMessage: string
} {
  if (overall >= 76)
    return {
      band: "high",
      bandLabel: "Dialed in",
      bandMessage: "Operating well. Fine-tune and protect it.",
    }
  if (overall >= 56)
    return {
      band: "good",
      bandLabel: "Strong foundation",
      bandMessage: "Solid ground. Sharpen what compounds.",
    }
  if (overall >= 36)
    return {
      band: "moderate",
      bandLabel: "Clear openings",
      bandMessage: "Real openings to work with.",
    }
  return {
    band: "significant-gaps",
    bandLabel: "High leverage",
    bandMessage: "A lot of room to move. Start with your biggest lever below.",
  }
}

// Neutral, forward-facing comparison (Funnel v2 build doc): the number is a
// baseline to move from, never a rank. No "below average", no deficit talk.
function comparisonLabelFor(overall: number): string {
  return `Most people start near ${BENCHMARK_MEAN}. You are at ${overall} today, which is your baseline to move from.`
}

// ---------- LLM output normalization ----------

/**
 * Normalizes whatever JSON the score LLM returns into the 4-subscore shape
 * the UI consumes. Supports two known shapes (more can be added as admins
 * configure new prompts):
 *
 *   A. Legacy rubric  - { subscores: {dc, ia, dr, ea}, reasons?, nsState? }
 *   B. Simple eval    - { score: 1-10 (or 0-100), confidence?, top3issues?, summary? }
 *
 * Returns null only when no usable signal can be extracted - in that case
 * callers should fall back to the heuristic `scoreClarity`. When the LLM
 * returns a single overall score (shape B), it fans out to all four
 * subscores. This is intentional: we don't have per-pillar resolution from
 * the simple eval, but the overall number is still driven by the user's
 * answers (so it updates per-submission instead of being stuck on the
 * heuristic baseline).
 */
export function normalizeLlmScoreOutput(raw: unknown): {
  subscores: Subscores
  reasons?: Partial<Record<keyof Subscores, string>>
  nsState?: string
} | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>

  // Shape A: legacy 4-subscore rubric
  const sub = o.subscores
  if (sub && typeof sub === "object" && !Array.isArray(sub)) {
    const s = sub as Record<string, unknown>
    if (
      typeof s.directionClarity === "number" &&
      typeof s.identityAlignment === "number" &&
      typeof s.decisionReadiness === "number" &&
      typeof s.energyAlignment === "number"
    ) {
      const reasons =
        o.reasons && typeof o.reasons === "object" && !Array.isArray(o.reasons)
          ? (o.reasons as Partial<Record<keyof Subscores, string>>)
          : undefined
      return {
        subscores: {
          directionClarity: clamp(Math.round(s.directionClarity), 0, 100),
          identityAlignment: clamp(Math.round(s.identityAlignment), 0, 100),
          decisionReadiness: clamp(Math.round(s.decisionReadiness), 0, 100),
          energyAlignment: clamp(Math.round(s.energyAlignment), 0, 100),
        },
        reasons,
        nsState: typeof o.nsState === "string" ? o.nsState : undefined,
      }
    }
  }

  // Shape B: simple eval - a single overall score (1-10 or 0-100).
  let overall: number | null = null
  const candidates = [o.score, o.overall, o.rating, o.value]
  for (const c of candidates) {
    if (typeof c === "number" && !Number.isNaN(c)) {
      overall = c
      break
    }
    if (typeof c === "string") {
      const n = parseFloat(c)
      if (!Number.isNaN(n)) {
        overall = n
        break
      }
    }
  }
  if (overall === null) return null
  // Heuristic: values <=10 are assumed to be 1-10 scale and get scaled up.
  if (overall <= 10) overall = overall * 10
  overall = clamp(Math.round(overall), 0, 100)

  // Build a reason summary from whichever fields the prompt produced.
  const issuesRaw =
    o.top3issues ?? o.topIssues ?? o.top_issues ?? o.issues ?? o.topThreeIssues
  let reasonText = ""
  if (Array.isArray(issuesRaw)) {
    reasonText = issuesRaw
      .filter((x): x is string => typeof x === "string")
      .join("; ")
  }
  if (!reasonText && typeof o.summary === "string") reasonText = o.summary
  reasonText = reasonText.slice(0, 480)

  const reasons = reasonText
    ? {
        directionClarity: reasonText,
        identityAlignment: reasonText,
        decisionReadiness: reasonText,
        energyAlignment: reasonText,
      }
    : undefined

  return {
    subscores: {
      directionClarity: overall,
      identityAlignment: overall,
      decisionReadiness: overall,
      energyAlignment: overall,
    },
    reasons,
    nsState: typeof o.nsState === "string" ? o.nsState : undefined,
  }
}

// ---------- LLM-sourced subscore assembly ----------

/**
 * Given subscores produced by the LLM scorer (or any external source),
 * wrap them into the same ClarityScore shape the UI expects. Does NOT
 * apply the thin-response guardrail - the LLM has already accounted for
 * answer thinness via the rubric.
 */
export function buildClarityScoreFromSubscores(subs: Subscores): ClarityScore {
  const direction = clamp(Math.round(subs.directionClarity), 0, 100)
  const identity = clamp(Math.round(subs.identityAlignment), 0, 100)
  const decision = clamp(Math.round(subs.decisionReadiness), 0, 100)
  const energy = clamp(Math.round(subs.energyAlignment), 0, 100)

  const overall = Math.round(
    direction * SUBSCORE_WEIGHTS.directionClarity +
      identity * SUBSCORE_WEIGHTS.identityAlignment +
      decision * SUBSCORE_WEIGHTS.decisionReadiness +
      energy * SUBSCORE_WEIGHTS.energyAlignment
  )

  const bandInfo = bandFor(overall)

  return {
    overall: clamp(overall, 0, 100),
    subscores: {
      directionClarity: direction,
      identityAlignment: identity,
      decisionReadiness: decision,
      energyAlignment: energy,
    },
    ...bandInfo,
    benchmarkMean: BENCHMARK_MEAN,
    comparisonLabel: comparisonLabelFor(overall),
    subscoreDetails: [
      {
        key: "directionClarity",
        label: "Direction Clarity",
        pillar: "Purpose",
        weight: SUBSCORE_WEIGHTS.directionClarity,
        value: direction,
      },
      {
        key: "identityAlignment",
        label: "Identity Alignment",
        pillar: "Identity",
        weight: SUBSCORE_WEIGHTS.identityAlignment,
        value: identity,
      },
      {
        key: "decisionReadiness",
        label: "Decision Readiness",
        pillar: "Peace of Mind",
        weight: SUBSCORE_WEIGHTS.decisionReadiness,
        value: decision,
      },
      {
        key: "energyAlignment",
        label: "Energy Alignment",
        pillar: "Embodiment",
        weight: SUBSCORE_WEIGHTS.energyAlignment,
        value: energy,
      },
    ],
  }
}

// ---------- entry point ----------

export function scoreClarity(responses: Responses): ClarityScore {
  const totalLen =
    norm(responses.question1).length +
    norm(responses.question2).length +
    norm(responses.question3).length +
    norm(responses.question4).length +
    norm(responses.question5).length

  let direction = computeDirectionClarity(responses)
  let identity = computeIdentityAlignment(responses)
  let decision = computeDecisionReadiness(responses)
  let energy = computeEnergyAlignment(responses)

  // Thin-response guardrail: very short total answers compress scores toward
  // the low end of the audience range to avoid overstating readiness.
  if (totalLen < 120) {
    const shrink = (n: number) => Math.round(n * 0.7 + 20 * 0.3)
    direction = shrink(direction)
    identity = shrink(identity)
    decision = shrink(decision)
    energy = shrink(energy)
  } else if (totalLen < 300) {
    const shrink = (n: number) => Math.round(n * 0.88)
    direction = shrink(direction)
    identity = shrink(identity)
    decision = shrink(decision)
    energy = shrink(energy)
  }

  const overall = Math.round(
    direction * SUBSCORE_WEIGHTS.directionClarity +
      identity * SUBSCORE_WEIGHTS.identityAlignment +
      decision * SUBSCORE_WEIGHTS.decisionReadiness +
      energy * SUBSCORE_WEIGHTS.energyAlignment
  )

  const bandInfo = bandFor(overall)

  return {
    overall: clamp(overall, 0, 100),
    subscores: {
      directionClarity: direction,
      identityAlignment: identity,
      decisionReadiness: decision,
      energyAlignment: energy,
    },
    ...bandInfo,
    benchmarkMean: BENCHMARK_MEAN,
    comparisonLabel: comparisonLabelFor(overall),
    subscoreDetails: [
      {
        key: "directionClarity",
        label: "Direction Clarity",
        pillar: "Purpose",
        weight: SUBSCORE_WEIGHTS.directionClarity,
        value: direction,
      },
      {
        key: "identityAlignment",
        label: "Identity Alignment",
        pillar: "Identity",
        weight: SUBSCORE_WEIGHTS.identityAlignment,
        value: identity,
      },
      {
        key: "decisionReadiness",
        label: "Decision Readiness",
        pillar: "Peace of Mind",
        weight: SUBSCORE_WEIGHTS.decisionReadiness,
        value: decision,
      },
      {
        key: "energyAlignment",
        label: "Energy Alignment",
        pillar: "Embodiment",
        weight: SUBSCORE_WEIGHTS.energyAlignment,
        value: energy,
      },
    ],
  }
}
