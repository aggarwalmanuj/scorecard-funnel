// Rebrand an exported admin prompt-config JSON (ufa-config-*.json) to the
// new "Belief Score" branding and strip em dashes — WITHOUT reformatting the
// file. Operates on the raw text and only rewrites the target substrings, so
// your carefully-tuned prompts are preserved byte-for-byte except the edits.
//
// Usage:
//   node scripts/rebrand-prompt-config.mjs                       # all ufa-config-*.json in cwd
//   node scripts/rebrand-prompt-config.mjs path/to/one.json two.json
//
// Writes a sibling file `<name>.belief-score.json` (never overwrites the
// original) and prints exactly what it changed. Re-import that output via the
// admin "Import config" control.
import { readFileSync, writeFileSync, readdirSync } from "node:fs"
import { basename, dirname, join } from "node:path"

// Ordered: most-specific first so the catch-all never pre-empts a phrase.
const BRAND_RULES = [
  ["Unfair Advantage Report", "Belief Score Report"],
  ["Clarity Readiness Report", "Belief Score Report"], // report framing name
  ["Unfair Advantage reflection", "Belief Score reflection"],
  ["Honest Decision Challenge", "Belief Score assessment"],
  ["Unfair Advantage", "Belief Score"], // catch-all for anything left
]

const EM_DASH = /—/g // — only; en dashes and hyphens are left alone

function countOccurrences(haystack, needle) {
  if (!needle) return 0
  let n = 0
  let i = haystack.indexOf(needle)
  while (i !== -1) {
    n++
    i = haystack.indexOf(needle, i + needle.length)
  }
  return n
}

function processFile(path) {
  const raw = readFileSync(path, "utf8")
  let out = raw
  const changes = []

  for (const [from, to] of BRAND_RULES) {
    const hits = countOccurrences(out, from)
    if (hits > 0) {
      out = out.split(from).join(to)
      changes.push(`  ${hits}×  "${from}" -> "${to}"`)
    }
  }

  const emHits = (out.match(EM_DASH) || []).length
  if (emHits > 0) {
    out = out.replace(EM_DASH, "-")
    changes.push(`  ${emHits}×  em dash (—) -> "-"`)
  }

  // Sanity: the result must still be valid JSON.
  try {
    JSON.parse(out)
  } catch (e) {
    console.error(`✗ ${basename(path)} — refusing to write, result is not valid JSON: ${e.message}`)
    return
  }

  if (changes.length === 0) {
    console.log(`• ${basename(path)} — nothing to change.`)
    return
  }

  const outPath = join(dirname(path), basename(path).replace(/\.json$/i, "") + ".belief-score.json")
  writeFileSync(outPath, out, "utf8")
  console.log(`✓ ${basename(path)} -> ${basename(outPath)}`)
  console.log(changes.join("\n"))
}

const args = process.argv.slice(2)
const targets =
  args.length > 0
    ? args
    : readdirSync(process.cwd())
        .filter((f) => /^ufa-config-.*\.json$/i.test(f) && !/\.belief-score\.json$/i.test(f))
        .map((f) => join(process.cwd(), f))

if (targets.length === 0) {
  console.error("No input files. Pass paths, or run from a folder containing ufa-config-*.json")
  process.exit(1)
}

for (const t of targets) processFile(t)
console.log("\nDone. Import the *.belief-score.json file(s) via the admin panel.")
