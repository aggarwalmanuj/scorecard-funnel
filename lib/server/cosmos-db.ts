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
  createdAt: string
}

// Maximum bytes we accept for the prompt-text snapshot. Guards against an
// abusive client inflating documents past the 2 MB Cosmos item limit.
const MAX_QUESTION_TEXT_LEN = 4000

export async function fetchUsers(
  pageSize = 25,
  continuationToken?: string
): Promise<{ users: UserDocument[]; continuationToken: string | undefined; hasMore: boolean }> {
  await ensureInitialized()
  const container = usersContainer()
  const querySpec = {
    query: "SELECT * FROM c ORDER BY c.createdAt DESC",
  }

  const response = container.items.query<UserDocument>(querySpec, {
    maxItemCount: pageSize,
    continuationToken,
  })

  const { resources, continuationToken: nextToken, hasMoreResults } = await response.fetchNext()

  return {
    users: resources ?? [],
    continuationToken: nextToken ?? undefined,
    hasMore: hasMoreResults ?? false,
  }
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

  const operations = Object.entries(data).map(([key, value]) =>
    container.items.upsert({ id: key, value })
  )

  await Promise.all(operations)
}

/* ═══════════════════════════════════════════════
   Users container
   ═══════════════════════════════════════════════ */

/** Get the next serial number by finding the current max. */
async function getNextSerialNumber(): Promise<number> {
  const container = usersContainer()
  const { resources } = await container.items
    .query("SELECT VALUE MAX(StringToNumber(c.id)) FROM c")
    .fetchAll()

  const maxSno = resources[0] ?? 0
  return (typeof maxSno === "number" && !Number.isNaN(maxSno) ? maxSno : 0) + 1
}

/**
 * Signup: ALWAYS creates a new document, even for repeat emails.
 * Returns the newly assigned S.No (stored as `id`).
 */
export async function appendSignupRow(
  firstName: string,
  email: string,
  audience: Audience | "" = ""
): Promise<number> {
  await ensureInitialized()
  const sno = await getNextSerialNumber()
  const container = usersContainer()

  await container.items.create({
    id: String(sno),
    firstName,
    email,
    audience,
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
