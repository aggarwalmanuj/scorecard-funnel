/**
 * Funnel v2 prompt updates (BUILD-Sahil-Funnel-v2), authored to the doc's
 * spec because ufa-config-individual-FINAL.json was not found on disk:
 *  - report_system/report_user -> synced to expanded code defaults
 *    (belief-first headline, 7 tool fields, leverage constraint, subscore
 *    placeholders)
 *  - summary_system -> names the pattern, WITHHOLDS the belief + origin,
 *    sells concrete deliverables (first move, 30-day sequence)
 *  - beat5 -> stops restating the belief; points to the plan naming it
 * Individual audience only (doc scope: "Team config unchanged for now").
 */
const fs = require("fs")

const env = fs.readFileSync("d:/Documents/GitHub/scorecard-funnel/.env.local", "utf8")
const PW = env.match(/^ADMIN_API_PASSWORD=(.+)$/m)[1].trim()
const BASE = "http://localhost:3100"

const src = fs.readFileSync("d:/Documents/GitHub/scorecard-funnel/lib/default-report-prompt.ts", "utf8")
const sys = src.match(/DEFAULT_REPORT_SYSTEM_PROMPT = `([\s\S]*?)`/)
const usr = src.match(/DEFAULT_REPORT_USER_PROMPT = `([\s\S]*?)`/)
if (!sys || !usr) throw new Error("prompt extraction failed")
const REPORT_SYSTEM = sys[1].replace(/\r\n/g, "\n")
const REPORT_USER = usr[1].replace(/\r\n/g, "\n")
if (!REPORT_SYSTEM.includes("scoreFraming") || !REPORT_USER.includes("{{SCORE_DIRECTION}}"))
  throw new Error("extracted prompts missing v2 fields")

const SUMMARY_SYSTEM = `You are a deeply perceptive guide who has just witnessed someone go through a profound journey of self-reflection. You are writing their closing summary - ONE script that is both READ ALOUD by a voice engine and displayed as text. Every sentence must survive being spoken: flowing prose only. No headers, no bullets, no symbols, no digits (write "thirty days" and "forty-seven dollars", never "30" or "$47"). Never say "AI Merge". Banned words: nervous system, trauma, dysregulation, somatic, mindset.

Your tone: warm, direct, unhurried. No buzzwords, no motivational language, no therapy-speak. Short, meaningful sentences. You trust silence. You never exaggerate. Never use em dashes; use commas and periods.

THE ONE RULE ABOVE ALL: name the pattern precisely, but NEVER state the belief underneath it and NEVER say where the pattern began. That is what the Action Plan delivers. If this summary spells out the belief, the reader has no reason to buy. Tease it honestly: there is a specific conclusion running underneath this loop, and the plan names it plainly, in writing.

First, silently classify (never name these to the reader):
- Their pattern archetype: deferral (puts the move off), vigilance (stays on guard), overload (everything at once), or self-doubt (discounts their own signal).
- Answer richness: RICH if their answers total roughly one hundred twenty words or more with at least two concrete scenes; otherwise THIN. If RICH, build the mirror from their specific scenes and words. If THIN, stay grounded and modest, using what little they gave without inventing details.

Then write six movements as continuous spoken prose (no labels):
1. THE MIRROR, about sixty percent of the piece. Name their repeated moment and the loop in their own language. Include at least one short verbatim quote from their answers, woven in naturally.
2. THE EDGE. One or two sentences: underneath this loop there is a specific conclusion doing the driving. Do not name it. Say plainly that their Action Plan states it in their own words, on the first page.
3. WHAT COMES WITH THE PLAN, spoken as plain sentences, naming concrete deliverables: the belief named on page one, your first move with exactly when and what done looks like, an evidence log with the first entry already written from your answers, and a thirty-day sequence with a check-in at the end. Never call it a report. Never mention any retake or re-score.
4. THE CONTINUITY REFRAME. Place the scene they want (their fifth answer) next to the thing they said they refuse or fear (their fourth answer), and make clear the next step asks for the first without demanding the second.
5. THE QUIET TERMS. One time, forty-seven dollars, not a subscription. If it does not show them something they can act on this week, one email within thirty days and it is fully refunded.
6. THE THRESHOLD. End with dignity, not pressure: one sentence that mirrors their archetype (for deferral, the move is small enough to start; for vigilance, nothing here needs guarding; for overload, it is one thing, not everything; for self-doubt, their own words carried the signal). Then a short send-off that leaves the choice fully with them.

Length: two hundred forty to three hundred forty words. Economy is everything. Read it back aloud in your head before finishing; if any sentence sounds like a robot or a pitch, rewrite it.`

const BEAT5_OLD = "- Recap in four short lines what they now have: the repeated moment; the loop; the possible belief; the evidence that would show change."
const BEAT5_NEW = "- Recap in three short lines what they now have: the repeated moment; the loop; the evidence that would show change. Do NOT restate the belief hypothesis from earlier - say instead, in one line, that there is a specific conclusion underneath this loop, and their plan names it plainly, in writing."

async function main() {
  const cur = await fetch(`${BASE}/api/admin/prompts`, { headers: { "X-Admin-Password": PW } }).then((r) => r.json())
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  fs.writeFileSync(`${__dirname}/prompts-backup3-${stamp}.json`, JSON.stringify(cur))
  console.log("backup saved, keys:", Object.keys(cur.data).length)

  const beat5cur = cur.data.beat5_prompt_individual || cur.data.beat5_prompt || ""
  if (!beat5cur.includes(BEAT5_OLD)) throw new Error("beat5 recap line not found - aborting to avoid clobbering")
  const beat5new = beat5cur.replace(BEAT5_OLD, BEAT5_NEW)

  // Individual audience only, per the doc ("Team config unchanged for now").
  const data = {
    report_system_prompt_individual: REPORT_SYSTEM,
    report_user_prompt_individual: REPORT_USER,
    summary_system_prompt_individual: SUMMARY_SYSTEM,
    beat5_prompt: beat5new,
    beat5_prompt_individual: beat5new,
  }
  const res = await fetch(`${BASE}/api/admin/prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Password": PW },
    body: JSON.stringify({ data }),
  })
  console.log("write status:", res.status, await res.text())
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
