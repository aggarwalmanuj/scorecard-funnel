/**
 * Reads prompt templates from Cosmos DB and interpolates runtime values.
 * Placeholders: {{NAME}}, {{Q1}}–{{Q5}}, {{GATE2}}, {{GATE4}}
 *
 * All keys are now audience-scoped: `<base>_<audience>` where audience is
 * "individual" or "team". The team variant has NO fallback — when admins
 * haven't seeded team copy, callers receive a "not configured" error and
 * must surface a clear empty state to the user.
 */

import { sanitizeForPrompt } from "@/lib/security"
import { readPrompts } from "@/lib/server/cosmos-db"

export type Audience = "individual" | "team"

export type ChallengeResponses = {
  question1: string
  question2: string
  question3: string
  question4: string
  question5: string
}

export type Gate2Resonance = "HIGH" | "MID" | "LOW"
export type Gate4Tone = "LANDED" | "FAMILIAR" | "DISTANT"

const CACHE_TTL_MS = 5 * 60 * 1000
let promptCache: Record<string, string> | null = null
let cacheExpiry = 0

export function invalidatePromptCache(): void {
  promptCache = null
  cacheExpiry = 0
}

async function getCachedPrompts(): Promise<Record<string, string>> {
  const now = Date.now()
  if (promptCache && now < cacheExpiry) return promptCache

  try {
    const data = await readPrompts()
    if (Object.keys(data).length > 0) {
      promptCache = data
      cacheExpiry = now + CACHE_TTL_MS
      return data
    }
  } catch (e) {
    console.error("[challenge-prompts] Failed to read prompts:", (e as Error).message?.slice(0, 100))
  }

  if (promptCache) return promptCache
  return {}
}

function audienceKey(base: string, audience: Audience): string {
  return `${base}_${audience}`
}

async function getPrompt(base: string, audience: Audience): Promise<string> {
  const prompts = await getCachedPrompts()
  const key = audienceKey(base, audience)
  const value = prompts[key]
  if (!value) {
    throw new Error(
      `Prompt "${key}" not found in database. ${
        audience === "team"
          ? "Team content has not been configured yet — upload team prompts via the admin page."
          : "Save prompts from the admin page first."
      }`
    )
  }
  return value.replace(/\\n/g, "\n")
}

export async function buildSystemPrompt(
  audience: Audience,
  firstName: string,
  responses: ChallengeResponses
): Promise<string> {
  const name = sanitizeForPrompt(firstName.trim()) || "This person"
  const template = await getPrompt("system_prompt", audience)
  return template
    .replace(/\{\{NAME\}\}/g, name)
    .replace(/\{\{Q1\}\}/g, sanitizeForPrompt(responses.question1))
    .replace(/\{\{Q2\}\}/g, sanitizeForPrompt(responses.question2))
    .replace(/\{\{Q3\}\}/g, sanitizeForPrompt(responses.question3))
    .replace(/\{\{Q4\}\}/g, sanitizeForPrompt(responses.question4))
    .replace(/\{\{Q5\}\}/g, sanitizeForPrompt(responses.question5))
}

/** Get the beat-specific system context (role/instructions for this beat). */
export async function getBeatSystemContext(
  audience: Audience,
  beatNumber: 1 | 2 | 3 | 4 | 5
): Promise<string> {
  try {
    return await getPrompt(`beat${beatNumber}_systemContext`, audience)
  } catch {
    return ""
  }
}

export async function buildUserPromptForBeat(
  audience: Audience,
  beatNumber: 1 | 2 | 3 | 4 | 5,
  gate2Resonance: Gate2Resonance,
  gate4Tone: Gate4Tone
): Promise<string> {
  const template = await getPrompt(`beat${beatNumber}_prompt`, audience)
  return template
    .replace(/\{\{GATE2\}\}/g, gate2Resonance)
    .replace(/\{\{GATE4\}\}/g, gate4Tone)
}
