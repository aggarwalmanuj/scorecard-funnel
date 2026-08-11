// Seed per-vertical funnel content into Cosmos from the config files in
// belief-score-config/. Complements the admin UI's Import button (which
// requires FULL configs) by accepting PARTIAL configs: only the keys present
// and non-empty in the file are written, so unset fields keep inheriting
// from main at runtime (see resolvePromptValue in challenge-prompts.ts).
//
// Config file shape: the admin export format (version 3) —
//   { audience, systemPrompt?, reportSystemPrompt?, reportUserPrompt?,
//     scoreSystemPrompt?, scoreUserPrompt?, summarySystemPrompt?,
//     summaryUserPrompt?, questions?[5], beats?[5], entryContent? }
//
// Usage:
//   node --env-file=.env.local scripts/seed-vertical-content.mjs <file.json> [more.json ...]           # dry run
//   node --env-file=.env.local scripts/seed-vertical-content.mjs --apply <file.json> [more.json ...]   # write
//   node --env-file=.env.local scripts/seed-vertical-content.mjs --apply belief-score-config/belief-score-config-adhd.json belief-score-config/belief-score-config-healthcare.json belief-score-config/belief-score-config-retargeting.json
//   node --env-file=.env.local scripts/seed-vertical-content.mjs --apply --db=scorecard belief-score-config/belief-score-config-coaches.json
//
// WHICH DATABASE: this account holds several (funnel-db, test, scorecard, ...).
// `.env.local` sets COSMOS_DATABASE=test, but the LIVE site reads `scorecard` -
// so a seed run with .env.local alone lands in a database nothing serves, and
// silently appears to succeed. Always pass --db=<name> when the target is not
// the one in your env, and check the "Connected to Cosmos" line before trusting
// the result.
//
// Safety properties:
//   - Dry-run by default; --apply to write.
//   - Empty/absent fields are SKIPPED (never writes an empty override).
//   - Refuses to write to "main" unless --allow-main is passed (main is the
//     live base every vertical inherits from - seeding it is a bigger deal).
//   - Prints every key it writes with the value length, and the target database
//     in both dry-run and apply mode.

import { readFileSync } from "node:fs"
import { CosmosClient } from "@azure/cosmos"

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const ALLOW_MAIN = args.includes("--allow-main")
const DB_FLAG = args.find((a) => a.startsWith("--db="))?.slice("--db=".length)
const files = args.filter((a) => !a.startsWith("--"))

const ENDPOINT = process.env.COSMOS_ENDPOINT
const KEY = process.env.COSMOS_KEY
const DB_NAME = DB_FLAG || process.env.COSMOS_DATABASE || "funnel-db"

if (!ENDPOINT || !KEY) {
  console.error("Missing COSMOS_ENDPOINT or COSMOS_KEY in env. Run with --env-file=.env.local")
  process.exit(1)
}

const KNOWN_VERTICALS = ["main", "retargeting", "adhd", "healthcare", "coaches", "parents"]

if (files.length === 0) {
  console.error("Pass at least one config file path.")
  process.exit(1)
}

/** Build the Cosmos key/value pairs a single config file contributes. */
function keysFromConfig(cfg) {
  const aud = cfg.audience
  const out = []
  const push = (base, value) => {
    if (typeof value === "string" && value.trim() !== "") {
      out.push({ id: `${base}_${aud}`, value })
    }
  }
  push("system_prompt", cfg.systemPrompt)
  push("report_system_prompt", cfg.reportSystemPrompt)
  push("report_user_prompt", cfg.reportUserPrompt)
  push("score_system_prompt", cfg.scoreSystemPrompt)
  push("score_user_prompt", cfg.scoreUserPrompt)
  push("summary_system_prompt", cfg.summarySystemPrompt)
  push("summary_user_prompt", cfg.summaryUserPrompt)

  if (Array.isArray(cfg.questions) && cfg.questions.length === 5) {
    push("questions", JSON.stringify(cfg.questions))
  } else if (cfg.questions !== undefined) {
    throw new Error(`"questions" must be an array of exactly 5 (got ${cfg.questions?.length})`)
  }

  if (Array.isArray(cfg.beats)) {
    if (cfg.beats.length !== 5) throw new Error(`"beats" must have exactly 5 entries (got ${cfg.beats.length})`)
    cfg.beats.forEach((b, i) => {
      push(`beat${i + 1}_label`, b.label)
      push(`beat${i + 1}_title`, b.title)
      push(`beat${i + 1}_subtitle`, b.subtitle)
      push(`beat${i + 1}_feedbackQuestion`, b.feedbackQuestion)
      push(`beat${i + 1}_systemContext`, b.systemContext)
      push(`beat${i + 1}_prompt`, b.userPrompt)
    })
  }

  if (cfg.entryContent && typeof cfg.entryContent === "object") {
    // Strip empty string fields so runtime per-field inheritance from main
    // stays live for anything the pack doesn't set (ctaLabel etc.).
    const pack = {}
    for (const [k, v] of Object.entries(cfg.entryContent)) {
      if (typeof v === "string" ? v.trim() !== "" : typeof v === "boolean") pack[k] = v
    }
    if (Object.keys(pack).length > 0) {
      out.push({ id: `entry_content_${aud}`, value: JSON.stringify(pack) })
    }
  }

  return out
}

async function main() {
  const plans = []
  for (const file of files) {
    const cfg = JSON.parse(readFileSync(file, "utf8"))
    if (!KNOWN_VERTICALS.includes(cfg.audience)) {
      throw new Error(`${file}: unknown audience "${cfg.audience}" (expected one of ${KNOWN_VERTICALS.join(", ")})`)
    }
    if (cfg.audience === "main" && !ALLOW_MAIN) {
      throw new Error(`${file}: refusing to seed "main" without --allow-main (main is the live base all verticals inherit from)`)
    }
    plans.push({ file, audience: cfg.audience, keys: keysFromConfig(cfg) })
  }

  console.log(`Mode: ${APPLY ? "APPLY (will write)" : "DRY RUN (no writes)"}`)
  console.log(
    `Target database: ${DB_NAME}${DB_FLAG ? " (--db)" : " (COSMOS_DATABASE / default)"} — the live site reads "scorecard"`
  )
  console.log("")
  for (const plan of plans) {
    console.log(`${plan.file} -> vertical "${plan.audience}" (${plan.keys.length} keys):`)
    for (const { id, value } of plan.keys) {
      console.log(`  ${id.padEnd(42)} (${value.length} chars)`)
    }
    console.log("")
  }

  if (!APPLY) {
    console.log("Dry run complete. Re-run with --apply to write these keys.")
    return
  }

  const client = new CosmosClient({ endpoint: ENDPOINT, key: KEY })
  const container = client.database(DB_NAME).container("prompts")
  console.log(`Connected to Cosmos: ${ENDPOINT} / ${DB_NAME} / prompts`)

  let ok = 0
  let failed = 0
  const failures = []
  // Cosmos throttles (429) when a tight write loop exceeds provisioned RU.
  // Without retry those writes fail SILENTLY as far as content goes - the
  // vertical is left partially seeded and quietly falls back to main. Retry
  // with backoff, honouring the server's retryAfterInMs when present.
  const upsertWithRetry = async (id, value, attempts = 6) => {
    let lastErr
    for (let i = 0; i < attempts; i++) {
      try {
        await container.items.upsert({ id, value })
        return true
      } catch (e) {
        lastErr = e
        // Upserts are idempotent, so retry EVERY error - 429 throttling and
        // transient RestError/socket failures both resolve on a retry, and
        // a genuinely bad request will simply exhaust the attempts.
        const waitMs = e?.retryAfterInMs ?? 300 * Math.pow(2, i)
        await new Promise((r) => setTimeout(r, waitMs))
      }
    }
    failures.push(`${id}: ${lastErr?.message || lastErr}`)
    return false
  }

  for (const plan of plans) {
    for (const { id, value } of plan.keys) {
      if (await upsertWithRetry(id, value)) ok++
      else failed++
      // Small pacing gap keeps a 39-key seed under typical RU limits.
      await new Promise((r) => setTimeout(r, 40))
    }
  }
  if (failures.length) {
    console.error("\nFAILED KEYS (re-run the script to retry these):")
    failures.forEach((f) => console.error("  " + f))
  }
  console.log("")
  console.log(`Done. Wrote ${ok} keys. Failed: ${failed}.`)
  console.log("The server prompt cache expires within 5 minutes; a save from /admin picks it up immediately.")
}

main().catch((e) => {
  console.error("Seed failed:", e.message || e)
  process.exit(1)
})
