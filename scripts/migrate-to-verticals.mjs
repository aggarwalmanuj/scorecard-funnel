// One-time verticals migration (2026-07-22): the funnel moved from two
// audiences ("individual" / "team") to the vertical registry in
// lib/verticals.ts (main / retargeting / adhd / healthcare), where "main"
// replaces "individual" and "team" is retired.
//
// What it does:
//   1. Backs up EVERY key in the prompts container to
//      prompt-backups/<stamp>-pre-verticals.json (always, even on dry run).
//   2. Copies every `<base>_individual` key to `<base>_main` (skips keys
//      where a non-empty `_main` already exists).
//   3. With --delete-team, deletes every `<base>_team` key. Without the
//      flag they are only listed. (They're in the backup either way.)
//
// Usage:
//   node --env-file=.env.local scripts/migrate-to-verticals.mjs                        # dry run
//   node --env-file=.env.local scripts/migrate-to-verticals.mjs --apply                # copy _individual -> _main
//   node --env-file=.env.local scripts/migrate-to-verticals.mjs --apply --delete-team  # ...and drop _team keys
//
// Safety properties:
//   - Idempotent — re-running finds nothing left to do.
//   - Never overwrites — existing non-empty `_main` values are left alone.
//   - Defaults to dry-run; you must pass --apply to mutate.
//   - The `_individual` keys are KEPT (the runtime resolver still reads
//     them as a last-resort alias), so a half-deployed state can't blank
//     the live funnel. Delete them manually months from now if you like.

import { writeFileSync, mkdirSync } from "node:fs"
import { CosmosClient } from "@azure/cosmos"

const ENDPOINT = process.env.COSMOS_ENDPOINT
const KEY = process.env.COSMOS_KEY
const DB_NAME = process.env.COSMOS_DATABASE ?? "funnel-db"

if (!ENDPOINT || !KEY) {
  console.error("Missing COSMOS_ENDPOINT or COSMOS_KEY in env. Run with --env-file=.env.local")
  process.exit(1)
}

const APPLY = process.argv.includes("--apply")
const DELETE_TEAM = process.argv.includes("--delete-team")

async function main() {
  const client = new CosmosClient({ endpoint: ENDPOINT, key: KEY })
  const container = client.database(DB_NAME).container("prompts")

  console.log(`Connected to Cosmos: ${ENDPOINT} / ${DB_NAME} / prompts`)
  console.log(`Mode: ${APPLY ? "APPLY (will write)" : "DRY RUN (no writes)"}${DELETE_TEAM ? " + delete _team keys" : ""}`)
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

  // 1. Backup — full dump, always.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  mkdirSync("prompt-backups", { recursive: true })
  const backupPath = `prompt-backups/${stamp}-pre-verticals.json`
  writeFileSync(backupPath, JSON.stringify(Object.fromEntries(allKeys), null, 2))
  console.log(`Backup written: ${backupPath}`)
  console.log("")

  // 2. Copy plan: `<base>_individual` -> `<base>_main`.
  const copies = []
  for (const [key, value] of allKeys) {
    const m = key.match(/^(.+)_individual$/)
    if (!m) continue
    if (value === "" || value == null) continue
    const dest = `${m[1]}_main`
    if (allKeys.has(dest) && allKeys.get(dest) !== "") continue // already seeded
    copies.push({ src: key, dest, value, length: value.length })
  }

  // 3. Team keys (delete list).
  const teamKeys = [...allKeys.keys()].filter((k) => /_team$/.test(k))

  if (copies.length === 0) {
    console.log("Nothing to copy — every _main key already exists with content.")
  } else {
    console.log(`Copy plan (${copies.length} writes):`)
    for (const { src, dest, length } of copies) {
      console.log(`  ${src.padEnd(45)} -> ${dest.padEnd(45)} (${length} chars)`)
    }
  }
  console.log("")
  console.log(`Team keys found: ${teamKeys.length}${teamKeys.length > 0 ? ` (${DELETE_TEAM ? "WILL DELETE" : "kept; pass --delete-team to remove"})` : ""}`)
  for (const k of teamKeys) console.log(`  ${k}`)

  if (!APPLY) {
    console.log("")
    console.log("Dry run complete. Re-run with --apply to perform these changes.")
    return
  }

  console.log("")
  console.log("Writing...")
  let ok = 0
  let failed = 0
  for (const { dest, value } of copies) {
    try {
      await container.items.upsert({ id: dest, value })
      ok++
    } catch (e) {
      failed++
      console.error(`  FAILED upsert ${dest}:`, e?.message || e)
    }
  }
  console.log(`Copied ${ok} keys. Failed: ${failed}.`)

  if (DELETE_TEAM && teamKeys.length > 0) {
    console.log("Deleting _team keys...")
    let dOk = 0
    let dFailed = 0
    for (const k of teamKeys) {
      try {
        await container.item(k, k).delete()
        dOk++
      } catch (e) {
        dFailed++
        console.error(`  FAILED delete ${k}:`, e?.message || e)
      }
    }
    console.log(`Deleted ${dOk} keys. Failed: ${dFailed}.`)
  }

  console.log("")
  console.log("Done. The server prompt cache expires within 5 minutes; saving")
  console.log("once from /admin (or redeploying) picks the new keys up immediately.")
}

main().catch((e) => {
  console.error("Migration failed:", e)
  process.exit(1)
})
