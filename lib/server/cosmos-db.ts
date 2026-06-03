import { CosmosClient, type Container, type Database } from "@azure/cosmos"

/* ═══════════════════════════════════════════════
   Cosmos DB Client — replaces Google Sheets
   ═══════════════════════════════════════════════ */

const ENDPOINT = process.env.COSMOS_ENDPOINT ?? ""
const KEY = process.env.COSMOS_KEY ?? ""
const DB_NAME = process.env.COSMOS_DATABASE ?? "funnel-db"

let _client: CosmosClient | null = null
let _db: Database | null = null
let _initialized = false

function getClient(): CosmosClient {
  if (!_client) {
    if (!ENDPOINT || !KEY) throw new Error("Cosmos DB is not configured")
    _client = new CosmosClient({ endpoint: ENDPOINT, key: KEY })
  }
  return _client
}

function getDatabase(): Database {
  if (!_db) {
    _db = getClient().database(DB_NAME)
  }
  return _db
}

/** Auto-create database and containers if they don't exist (runs once). */
async function ensureInitialized(): Promise<void> {
  if (_initialized) return
  const client = getClient()
  await client.databases.createIfNotExists({ id: DB_NAME })
  const db = getDatabase()
  await db.containers.createIfNotExists({ id: "users", partitionKey: { paths: ["/email"] } })
  await db.containers.createIfNotExists({ id: "prompts", partitionKey: { paths: ["/id"] } })
  _initialized = true
}

function usersContainer(): Container {
  return getDatabase().container("users")
}

function promptsContainer(): Container {
  return getDatabase().container("prompts")
}

export function isCosmosConfigured(): boolean {
  return Boolean(ENDPOINT && KEY && DB_NAME)
}

/* ═══════════════════════════════════════════════
   Users — paginated read (admin)
   ═══════════════════════════════════════════════ */

export type Audience = "individual" | "team"

export type UserDocument = {
  id: string
  firstName: string
  email: string
  audience: Audience | ""
  question1: string
  question2: string
  question3: string
  question4: string
  question5: string
  // Snapshot of the question text the user actually saw at the time they answered.
  // Required because the admin can change question wording and we still need to
  // know what each user was responding to.
  question1_text: string
  question2_text: string
  question3_text: string
  question4_text: string
  question5_text: string
  beat1_feedback: string
  beat2_feedback: string
  beat3_feedback: string
  beat4_feedback: string
  beat5_feedback: string
  beat1_output: string
  beat2_output: string
  beat3_output: string
  beat4_output: string
  beat5_output: string
  // Final user-facing outputs, persisted at generation time so the admin can
  // review/download exactly what each tester received. All four are optional
  // because they only exist once the user reaches the summary/report stage,
  // and older documents predate this feature.
  //   score_json   — JSON of { overall, subscores, band, reasons, nsState, scoreSource }
  //   report_json  — JSON of the full /api/challenge/report payload
  //   summary_text — the closing summary prose
  //   summary_audio_url — Vercel Blob URL of the summary MP3 (audio is too
  //                       large for a Cosmos item, so only the URL is stored)
  score_json?: string
  report_json?: string
  summary_text?: string
  summary_audio_url?: string
  // Tech-analytics telemetry (/techadmin). Captured client-side so a session
  // recording in PostHog can be tied back to a specific tester.
  ph_session_id?: string
  ph_distinct_id?: string
  // First-touch acquisition attribution, captured client-side at the landing
  // and persisted at signup. All optional — direct/organic visits and
  // documents that predate this feature simply omit them.
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  referrer?: string
  landing_page?: string
  // Purchase record. Written by the Stripe webhook (authoritative) and/or the
  // thank-you page (covers Calendly tiers, which never hit the Stripe webhook).
  paid_tier?: string
  paid_amount?: string
  paid_at?: string
  createdAt: string
}

/** First-touch acquisition attribution captured at signup. */
export type Attribution = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  referrer?: string
  landing_page?: string
}

// Per-field cap for attribution values. URLs/UTM tags are short; this guards
// against an abusive client inflating the document.
const MAX_ATTRIBUTION_LEN = 500

/** Trim attribution values to the whitelisted keys, dropping empties + capping length. */
function sanitizeAttribution(attribution?: Attribution): Record<string, string> {
  const keys: (keyof Attribution)[] = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "referrer",
    "landing_page",
  ]
  const out: Record<string, string> = {}
  if (!attribution) return out
  for (const key of keys) {
    const value = attribution[key]
    if (typeof value === "string" && value.trim().length > 0) {
      out[key] = value.slice(0, MAX_ATTRIBUTION_LEN)
    }
  }
  return out
}

/** Output fields the summary/report stage persists. Kept narrow so callers
 *  can't accidentally patch arbitrary columns through the outputs endpoint. */
export type UserOutputField =
  | "score_json"
  | "report_json"
  | "summary_text"
  | "summary_audio_url"

// Maximum bytes we accept for the prompt-text snapshot. Guards against an
// abusive client inflating documents past the 2 MB Cosmos item limit.
const MAX_QUESTION_TEXT_LEN = 4000

// Stateless OFFSET/LIMIT pagination. Cross-partition ORDER BY queries lose
// their in-memory merge buffer when the iterator is rebuilt from just a
// continuation token, which surfaces as empty pages with hasMore=true. The
// offset form is partition-safe, stateless on the server, and acceptable on
// RU cost for the admin panel's volumes.
export async function fetchUsers(
  pageSize = 25,
  offset = 0
): Promise<{ users: UserDocument[]; nextOffset: number; hasMore: boolean }> {
  await ensureInitialized()
  const container = usersContainer()

  // Fetch pageSize + 1 to detect hasMore in a single round-trip.
  const probe = pageSize + 1
  const querySpec = {
    query: "SELECT * FROM c ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit",
    parameters: [
      { name: "@offset", value: offset },
      { name: "@limit", value: probe },
    ],
  }

  const { resources } = await container.items
    .query<UserDocument>(querySpec)
    .fetchAll()

  const all = resources ?? []
  const hasMore = all.length > pageSize
  const users = hasMore ? all.slice(0, pageSize) : all

  return { users, nextOffset: offset + users.length, hasMore }
}

export async function searchUsers(opts: {
  query?: string
  dateFrom?: string
  dateTo?: string
  hasCompleted?: boolean
}): Promise<UserDocument[]> {
  await ensureInitialized()
  const container = usersContainer()

  const conditions: string[] = []
  const params: { name: string; value: string | boolean }[] = []

  if (opts.query) {
    const q = opts.query.toLowerCase()
    conditions.push(
      "(CONTAINS(LOWER(c.firstName), @q) OR CONTAINS(LOWER(c.email), @q) OR CONTAINS(LOWER(c.question1), @q) OR CONTAINS(LOWER(c.question2), @q) OR CONTAINS(LOWER(c.question3), @q) OR CONTAINS(LOWER(c.question4), @q) OR CONTAINS(LOWER(c.question5), @q) OR CONTAINS(LOWER(c.question1_text ?? ''), @q) OR CONTAINS(LOWER(c.question2_text ?? ''), @q) OR CONTAINS(LOWER(c.question3_text ?? ''), @q) OR CONTAINS(LOWER(c.question4_text ?? ''), @q) OR CONTAINS(LOWER(c.question5_text ?? ''), @q))"
    )
    params.push({ name: "@q", value: q })
  }

  if (opts.dateFrom) {
    conditions.push("c.createdAt >= @dateFrom")
    params.push({ name: "@dateFrom", value: opts.dateFrom })
  }

  if (opts.dateTo) {
    conditions.push("c.createdAt <= @dateTo")
    params.push({ name: "@dateTo", value: opts.dateTo + "T23:59:59.999Z" })
  }

  if (opts.hasCompleted === true) {
    conditions.push("(IS_DEFINED(c.question5) AND c.question5 != '')")
  } else if (opts.hasCompleted === false) {
    conditions.push("(NOT IS_DEFINED(c.question5) OR c.question5 = '')")
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""
  const querySpec = {
    query: `SELECT * FROM c${where} ORDER BY c.createdAt DESC`,
    parameters: params,
  }

  const { resources } = await container.items.query<UserDocument>(querySpec).fetchAll()
  return resources ?? []
}

/* ═══════════════════════════════════════════════
   Prompts container (key-value store)
   ═══════════════════════════════════════════════ */

/** Read all key-value pairs from the prompts container. */
export async function readPrompts(): Promise<Record<string, string>> {
  await ensureInitialized()
  const container = promptsContainer()
  const { resources } = await container.items
    .query("SELECT c.id, c[\"value\"] FROM c")
    .fetchAll()

  const result: Record<string, string> = {}
  for (const item of resources) {
    // Skip internal control documents (e.g. the serial-number counter)
    // so the admin prompts editor never sees them as editable prompts.
    if (typeof item.id === "string" && item.id.startsWith("__")) continue
    if (item.id && item.value !== undefined) {
      result[item.id] = String(item.value)
    }
  }
  return result
}

/** Write key-value pairs to the prompts container. Upserts each entry. */
export async function writePrompts(data: Record<string, string>): Promise<void> {
  await ensureInitialized()
  const container = promptsContainer()

  const entries = Object.entries(data)
  // Cosmos serverless / 400-RU containers throttle (429) when too many
  // upserts land in the same instant. The admin save now ships 70+ keys
  // (system + user prompts × 3 generators × 2 audiences + beats + questions),
  // so a flat Promise.all over all of them hit RU limits and surfaced as
  // "HTTP 502 / Failed to write prompts" in the UI with no save going through.
  // Chunking to a small concurrent batch keeps every key, just paced.
  const BATCH = 8
  for (let i = 0; i < entries.length; i += BATCH) {
    const slice = entries.slice(i, i + BATCH)
    await Promise.all(
      slice.map(([key, value]) => container.items.upsert({ id: key, value })),
    )
  }
}

/* ═══════════════════════════════════════════════
   Users container
   ═══════════════════════════════════════════════ */

/**
 * Atomically allocate the next serial number using a singleton counter
 * document with ETag-based optimistic concurrency. Two concurrent signups
 * will see the same ETag, only one's `replace` will succeed; the loser
 * gets 412 PreconditionFailed and retries — guaranteeing unique, gap-free
 * serial numbers under concurrency.
 *
 * The counter lives in the `prompts` container (keyed by /id) under the
 * id "__sno_counter" so we don't need a third container. On first call
 * (counter doc absent) we seed it from MAX(c.id) in the users container
 * so existing data isn't skipped. This migration path runs at most once
 * per deployment.
 */
const SNO_COUNTER_ID = "__sno_counter"
const SNO_MAX_ATTEMPTS = 10

async function seedCounterFromUsersMax(): Promise<number> {
  const users = usersContainer()
  const { resources } = await users.items
    .query("SELECT VALUE MAX(StringToNumber(c.id)) FROM c")
    .fetchAll()
  const max = resources[0]
  return typeof max === "number" && !Number.isNaN(max) ? max : 0
}

async function getNextSerialNumber(): Promise<number> {
  const counter = promptsContainer()
  for (let attempt = 0; attempt < SNO_MAX_ATTEMPTS; attempt++) {
    try {
      const { resource, etag } = await counter
        .item(SNO_COUNTER_ID, SNO_COUNTER_ID)
        .read<{ id: string; value: number }>()

      if (!resource) {
        // First-ever allocation — seed from existing users so we don't
        // hand out colliding ids for data that pre-dates the counter.
        const seed = await seedCounterFromUsersMax()
        try {
          await counter.items.create(
            { id: SNO_COUNTER_ID, value: seed + 1 },
            { accessCondition: { type: "IfNoneMatch", condition: "*" } },
          )
          return seed + 1
        } catch (e: unknown) {
          // Another process created the counter at the same time — fall
          // through to the read+CAS path on the next loop iteration.
          const code = (e as { code?: number })?.code
          if (code !== 409 /* Conflict */) throw e
          continue
        }
      }

      const current = typeof resource.value === "number" ? resource.value : 0
      const next = current + 1
      try {
        await counter
          .item(SNO_COUNTER_ID, SNO_COUNTER_ID)
          .replace(
            { id: SNO_COUNTER_ID, value: next },
            { accessCondition: { type: "IfMatch", condition: etag ?? "" } },
          )
        return next
      } catch (e: unknown) {
        const code = (e as { code?: number })?.code
        if (code === 412 /* PreconditionFailed — lost the CAS race */) continue
        throw e
      }
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code
      if (code === 404) {
        // Counter doc missing AND read threw 404 rather than returning
        // undefined — retry the loop to take the seed path.
        continue
      }
      throw e
    }
  }
  throw new Error(
    `[cosmos-db] Failed to allocate serial number after ${SNO_MAX_ATTEMPTS} CAS attempts`,
  )
}

/**
 * Signup: ALWAYS creates a new document, even for repeat emails.
 * Returns the newly assigned S.No (stored as `id`).
 */
export async function appendSignupRow(
  firstName: string,
  email: string,
  audience: Audience | "" = "",
  attribution?: Attribution
): Promise<number> {
  await ensureInitialized()
  const sno = await getNextSerialNumber()
  const container = usersContainer()

  await container.items.create({
    id: String(sno),
    firstName,
    email,
    audience,
    // First-touch acquisition attribution (utm_* / referrer / landing_page),
    // spread in only for the keys that are present.
    ...sanitizeAttribution(attribution),
    question1: "",
    question2: "",
    question3: "",
    question4: "",
    question5: "",
    question1_text: "",
    question2_text: "",
    question3_text: "",
    question4_text: "",
    question5_text: "",
    beat1_feedback: "",
    beat2_feedback: "",
    beat3_feedback: "",
    beat4_feedback: "",
    beat5_feedback: "",
    beat1_output: "",
    beat2_output: "",
    beat3_output: "",
    beat4_output: "",
    beat5_output: "",
    createdAt: new Date().toISOString(),
  })

  return sno
}

/**
 * Atomically set one or more fields on a user document. All ops land in a
 * single Cosmos patch so multi-field writes (e.g. answer + question-text
 * snapshot) cannot half-apply.
 */
async function updateUserFields(
  serialNumber: number,
  firstName: string,
  email: string,
  fields: Record<string, string>
): Promise<void> {
  const fieldEntries = Object.entries(fields)
  if (fieldEntries.length === 0) return

  await ensureInitialized()
  const container = usersContainer()
  const id = String(serialNumber)
  const ops = fieldEntries.map(([field, value]) => ({
    op: "set" as const,
    path: `/${field}`,
    value,
  }))

  // Use Cosmos DB patch to atomically set fields — avoids race conditions
  // when multiple beat outputs are saved concurrently.
  try {
    await container.item(id, email).patch(ops)
    return
  } catch (e: unknown) {
    const code = (e as { code?: number | string })?.code
    if (code !== 404 && code !== "NotFound") throw e
  }

  // Item not found with given email — query by id across partitions
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: id }],
    })
    .fetchAll()

  if (resources.length > 0) {
    const doc = resources[0]
    await container.item(id, doc.email).patch(ops)
    return
  }

  // Document truly doesn't exist — create a recovery row with the ORIGINAL serial number
  console.warn(`[cosmos-db] updateUserFields: no document found for id=${id}, creating recovery row`)
  const newDoc: Record<string, string> = {
    id,
    firstName,
    email,
    audience: "",
    question1: "",
    question2: "",
    question3: "",
    question4: "",
    question5: "",
    question1_text: "",
    question2_text: "",
    question3_text: "",
    question4_text: "",
    question5_text: "",
    beat1_feedback: "",
    beat2_feedback: "",
    beat3_feedback: "",
    beat4_feedback: "",
    beat5_feedback: "",
    beat1_output: "",
    beat2_output: "",
    beat3_output: "",
    beat4_output: "",
    beat5_output: "",
    createdAt: new Date().toISOString(),
  }
  for (const [field, value] of fieldEntries) newDoc[field] = value
  await container.items.create(newDoc)
}

/** Backwards-compatible single-field setter. */
async function updateUserField(
  serialNumber: number,
  firstName: string,
  email: string,
  field: string,
  value: string
): Promise<void> {
  await updateUserFields(serialNumber, firstName, email, { [field]: value })
}

/**
 * Update a specific question field for the user with the given S.No.
 * Also persists the question text the user actually saw, so the answer remains
 * interpretable after the admin edits the prompt copy.
 */
export async function updateQuestionCell(
  serialNumber: number,
  firstName: string,
  email: string,
  questionNumber: number,
  answer: string,
  questionText?: string
): Promise<void> {
  const fields: Record<string, string> = {
    [`question${questionNumber}`]: answer,
  }
  if (typeof questionText === "string") {
    // Defence in depth — the API route already validates length, but if a
    // future caller bypasses that we still cap here.
    fields[`question${questionNumber}_text`] =
      questionText.length > MAX_QUESTION_TEXT_LEN
        ? questionText.slice(0, MAX_QUESTION_TEXT_LEN)
        : questionText
  }
  await updateUserFields(serialNumber, firstName, email, fields)
}

/**
 * Update the feedback field for a specific beat.
 */
export async function updateFeedbackCell(
  serialNumber: number,
  firstName: string,
  email: string,
  beatNumber: number,
  feedback: string
): Promise<void> {
  const field = `beat${beatNumber}_feedback`
  await updateUserField(serialNumber, firstName, email, field, feedback)
}

/**
 * Save the AI-generated beat output text.
 */
export async function updateBeatOutputCell(
  serialNumber: number,
  firstName: string,
  email: string,
  beatNumber: number,
  output: string
): Promise<void> {
  const field = `beat${beatNumber}_output`
  await updateUserField(serialNumber, firstName, email, field, output)
}

/**
 * Persist one or more final user-facing outputs (score / report / summary /
 * audio URL) onto the user document, so the admin can review exactly what a
 * tester received. Unknown keys are dropped defensively — only the four
 * whitelisted output columns can be written through here.
 */
export async function updateUserOutputs(
  serialNumber: number,
  firstName: string,
  email: string,
  outputs: Partial<Record<UserOutputField, string>>
): Promise<void> {
  const allowed: UserOutputField[] = [
    "score_json",
    "report_json",
    "summary_text",
    "summary_audio_url",
  ]
  const fields: Record<string, string> = {}
  for (const key of allowed) {
    const value = outputs[key]
    if (typeof value === "string" && value.length > 0) fields[key] = value
  }
  await updateUserFields(serialNumber, firstName, email, fields)
}

/** Persist the tester's PostHog session/distinct id so /techadmin can link a
 *  response straight to its session recording. */
export async function updateUserTelemetry(
  serialNumber: number,
  firstName: string,
  email: string,
  telemetry: { ph_session_id?: string; ph_distinct_id?: string }
): Promise<void> {
  const fields: Record<string, string> = {}
  if (telemetry.ph_session_id) fields.ph_session_id = telemetry.ph_session_id.slice(0, 200)
  if (telemetry.ph_distinct_id) fields.ph_distinct_id = telemetry.ph_distinct_id.slice(0, 200)
  await updateUserFields(serialNumber, firstName, email, fields)
}

/** Record a completed purchase against the user document. */
export async function recordPurchase(
  serialNumber: number,
  firstName: string,
  email: string,
  purchase: { paid_tier: string; paid_amount?: string }
): Promise<void> {
  await updateUserFields(serialNumber, firstName, email, {
    paid_tier: purchase.paid_tier.slice(0, 40),
    paid_amount: (purchase.paid_amount ?? "").slice(0, 20),
    paid_at: new Date().toISOString(),
  })
}

/* ═══════════════════════════════════════════════
   Funnel analytics (/techadmin)
   ═══════════════════════════════════════════════ */

export interface FunnelStats {
  total: number
  stages: {
    signedUp: number
    answeredQ1: number
    answeredAll: number
    reachedBeats: number
    scored: number
    reported: number
    summarized: number
    purchased: number
  }
  byTier: Record<string, number>
  revenue: number
}

/**
 * Aggregate the whole users container into a funnel. Reads a thin projection
 * (not full documents) and counts in JS — fine for admin-panel volumes and far
 * simpler than a fan-out of COUNT queries. The "stages" are derived from data
 * we already store, so there's no separate page-tracking pipeline to maintain;
 * PostHog remains the source of truth for granular per-page paths.
 */
export async function fetchFunnelStats(): Promise<FunnelStats> {
  await ensureInitialized()
  const container = usersContainer()
  const { resources } = await container.items
    .query(
      "SELECT c.question1, c.question5, c.beat5_output, c.score_json, c.report_json, c.summary_text, c.paid_tier, c.paid_amount FROM c"
    )
    .fetchAll()

  const rows = resources ?? []
  const nonEmpty = (v: unknown) => typeof v === "string" && v.trim().length > 0

  const stages = {
    signedUp: rows.length,
    answeredQ1: 0,
    answeredAll: 0,
    reachedBeats: 0,
    scored: 0,
    reported: 0,
    summarized: 0,
    purchased: 0,
  }
  const byTier: Record<string, number> = {}
  let revenue = 0

  for (const r of rows) {
    if (nonEmpty(r.question1)) stages.answeredQ1++
    if (nonEmpty(r.question5)) stages.answeredAll++
    if (nonEmpty(r.beat5_output)) stages.reachedBeats++
    if (nonEmpty(r.score_json)) stages.scored++
    if (nonEmpty(r.report_json)) stages.reported++
    if (nonEmpty(r.summary_text)) stages.summarized++
    if (nonEmpty(r.paid_tier)) {
      stages.purchased++
      const tier = String(r.paid_tier)
      byTier[tier] = (byTier[tier] ?? 0) + 1
      const amt = Number.parseFloat(String(r.paid_amount ?? ""))
      if (Number.isFinite(amt)) revenue += amt
    }
  }

  return { total: rows.length, stages, byTier, revenue }
}
