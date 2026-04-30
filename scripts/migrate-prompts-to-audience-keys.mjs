// One-time migration: copy un-suffixed prompt keys to both
// `${key}_individual` and `${key}_team` so the audience-aware funnel works
// without re-seeding from scratch.
//
// Usage:
//   node --env-file=.env.local scripts/migrate-prompts-to-audience-keys.mjs            # dry run
//   node --env-file=.env.local scripts/migrate-prompts-to-audience-keys.mjs --apply    # actually write
//
// Safety properties:
//   - Idempotent — only writes a destination key if it doesn't already exist.
//   - Never overwrites — existing audience-suffixed values are left alone.
//   - Defaults to dry-run; you must pass --apply to mutate.

import { CosmosClient } from "@azure/cosmos"

const ENDPOINT = process.env.COSMOS_ENDPOINT
const KEY = process.env.COSMOS_KEY
const DB_NAME = process.env.COSMOS_DATABASE ?? "funnel-db"

if (!ENDPOINT || !KEY) {
  console.error("Missing COSMOS_ENDPOINT or COSMOS_KEY in env. Run with --env-file=.env.local")
  process.exit(1)
}

const APPLY = process.argv.includes("--apply")

// Allowlist of keys we know should be audience-keyed in the new schema.
// Anything else in the container (Calendly URL, etc.) is left untouched.
const MIGRATION_KEY_PATTERNS = [
  /^system_prompt$/,
  /^questions$/,
  /^beat[1-5]_label$/,
  /^beat[1-5]_title$/,
  /^beat[1-5]_subtitle$/,
  /^beat[1-5]_feedbackQuestion$/,
  /^beat[1-5]_systemContext$/,
  /^beat[1-5]_prompt$/,
]

function shouldMigrate(key) {
  return MIGRATION_KEY_PATTERNS.some((re) => re.test(key))
}

async function main() {
  const client = new CosmosClient({ endpoint: ENDPOINT, key: KEY })
  const db = client.database(DB_NAME)
  const container = db.container("prompts")

  console.log(`Connected to Cosmos: ${ENDPOINT} / ${DB_NAME} / prompts`)
  console.log(`Mode: ${APPLY ? "APPLY (will write)" : "DRY RUN (no writes)"}`)
  console.log("")

  const { resources } = await container.items
    .query('SELECT c.id, c["value"] FROM c')
    .fetchAll()

  const allKeys = new Map()
  for (const item of resources) {
    if (item.id && item.value !== undefined) {
      allKeys.set(item.id, String(item.value))
    }
  }

  console.log(`Total keys in DB: ${allKeys.size}`)

  const candidates = []
  for (const [key, value] of allKeys) {
    if (!shouldMigrate(key)) continue
    if (value === "" || value == null) continue
    for (const aud of ["individual", "team"]) {
      const dest = `${key}_${aud}`
      if (allKeys.has(dest) && allKeys.get(dest) !== "") {
        // Already exists with content — leave it alone.
        continue
      }
      candidates.push({ src: key, dest, value, length: value.length })
    }
  }

  if (candidates.length === 0) {
    console.log("Nothing to migrate. Either every audience-suffixed key already exists,")
    console.log("or the un-suffixed legacy keys are not present.")
    return
  }

  console.log(`Migration plan (${candidates.length} writes):`)
  for (const { src, dest, length } of candidates) {
    console.log(`  ${src.padEnd(40)} -> ${dest.padEnd(50)} (${length} chars)`)
  }

  if (!APPLY) {
    console.log("")
    console.log("Dry run complete. Re-run with --apply to perform these writes.")
    return
  }

  console.log("")
  console.log("Writing...")
  let ok = 0
  let failed = 0
  for (const { dest, value } of candidates) {
    try {
      await container.items.upsert({ id: dest, value })
      ok++
    } catch (e) {
      failed++
      console.error(`  FAILED ${dest}:`, e?.message || e)
    }
  }

  console.log("")
  console.log(`Done. Wrote ${ok} keys. Failed: ${failed}.`)
  if (failed === 0) {
    console.log("Restart your dev server (npm run dev) to pick up the new prompt cache.")
  }
}

main().catch((e) => {
  console.error("Migration failed:", e)
  process.exit(1)
})
