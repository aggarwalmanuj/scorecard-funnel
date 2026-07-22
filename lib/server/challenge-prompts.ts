/**
 * Reads prompt templates from Cosmos DB and interpolates runtime values.
 * Placeholders: {{NAME}}, {{Q1}}–{{Q5}}, {{GATE2}}, {{GATE4}}
 *
 * All keys are vertical-scoped: `<base>_<vertical>` (see lib/verticals.ts).
 * Resolution INHERITS from main: `<base>_<vertical>` → `<base>_main` →
 * `<base>_individual` (legacy alias, pre-migration safety net). A vertical
 * only needs to override the keys where its copy differs — an unseeded
 * vertical runs the whole funnel on main's content, never a hard error.
 */

import { DEFAULT_ENTRY_CONTENT, mergeEntryContent, type EntryContent } from "@/lib/entry-content"
import { sanitizeForPrompt } from "@/lib/security"
import { readPrompts } from "@/lib/server/cosmos-db"
import type { Vertical } from "@/lib/verticals"

export type Audience = Vertical

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

/**
 * Vertical-aware key resolution with main-inheritance:
 *   `<base>_<vertical>` → `<base>_main` → `<base>_individual` (legacy).
 * Empty strings count as "not set" so an admin can blank a field to revert
 * a vertical back to inheriting main's value.
 */
export function resolvePromptValue(
  prompts: Record<string, string>,
  base: string,
  vertical: Vertical
): string | undefined {
  return (
    prompts[`${base}_${vertical}`] ||
    prompts[`${base}_main`] ||
    prompts[`${base}_individual`] ||
    undefined
  )
}

async function getPrompt(base: string, audience: Audience): Promise<string> {
  const prompts = await getCachedPrompts()
  const value = resolvePromptValue(prompts, base, audience)
  if (!value) {
    throw new Error(
      `Prompt "${base}_${audience}" not found in database (no main fallback either). Save prompts from the admin page first.`
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

/**
 * Read the admin-configured detailed-scorecard (Clarity Readiness Report)
 * narrative prompt. Falls back to the supplied default when admins haven't
 * seeded a value - keeps the report endpoint working out of the box.
 */
export async function getReportSystemPrompt(
  audience: Audience,
  fallback: string
): Promise<string> {
  const prompts = await getCachedPrompts()
  const value = resolvePromptValue(prompts, "report_system_prompt", audience)
  if (!value) return fallback
  return value.replace(/\\n/g, "\n")
}

/**
 * Read the admin-configured score system prompt. Falls back to the supplied
 * default when admins haven't seeded a value - keeps the score endpoint
 * working out of the box.
 */
export async function getScoreSystemPrompt(
  audience: Audience,
  fallback: string
): Promise<string> {
  const prompts = await getCachedPrompts()
  const value = resolvePromptValue(prompts, "score_system_prompt", audience)
  if (!value) return fallback
  return value.replace(/\\n/g, "\n")
}

/**
 * Read the admin-configured closing-summary system prompt. Falls back to the
 * supplied default when admins haven't seeded a value - keeps the summary
 * endpoint working out of the box.
 */
export async function getSummarySystemPrompt(
  audience: Audience,
  fallback: string
): Promise<string> {
  const prompts = await getCachedPrompts()
  const value = resolvePromptValue(prompts, "summary_system_prompt", audience)
  if (!value) return fallback
  return value.replace(/\\n/g, "\n")
}

/**
 * Generic per-audience prompt-template reader for the score / report /
 * summary user-prompt templates. Falls back to the supplied default when no
 * Cosmos value has been saved. Returns the raw template - callers apply
 * placeholder substitution.
 */
async function getRawTemplate(
  baseKey: string,
  audience: Audience,
  fallback: string
): Promise<string> {
  const prompts = await getCachedPrompts()
  const value = resolvePromptValue(prompts, baseKey, audience)
  if (!value) return fallback
  return value.replace(/\\n/g, "\n")
}

export function getScoreUserPromptTemplate(
  audience: Audience,
  fallback: string
): Promise<string> {
  return getRawTemplate("score_user_prompt", audience, fallback)
}

export function getReportUserPromptTemplate(
  audience: Audience,
  fallback: string
): Promise<string> {
  return getRawTemplate("report_user_prompt", audience, fallback)
}

export function getSummaryUserPromptTemplate(
  audience: Audience,
  fallback: string
): Promise<string> {
  return getRawTemplate("summary_user_prompt", audience, fallback)
}

/**
 * Entry-page content pack for a vertical: `entry_content_<vertical>` →
 * `entry_content_main` → hardcoded defaults. Rides the same 5-min server
 * cache as prompts and is invalidated by the same admin POST.
 */
export async function getEntryContent(vertical: Vertical): Promise<EntryContent> {
  const prompts = await getCachedPrompts()
  const parse = (raw: string | undefined): unknown => {
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  // Main's pack over the hardcoded defaults, then the vertical's overrides
  // over that — per-field, so a vertical only diverges where it was edited.
  const mainPack = mergeEntryContent(
    parse(prompts["entry_content_main"]),
    DEFAULT_ENTRY_CONTENT
  )
  if (vertical === "main") return mainPack
  return mergeEntryContent(parse(prompts[`entry_content_${vertical}`]), mainPack)
}
