/**
 * Phase A prompt updates (artifacts 2 + 4):
 *  - summary_system_prompt_* -> audio-first six-movement script
 *  - report_system_prompt_*  -> synced to the expanded code default
 *    (six-page Action Plan fields), keeping one source of truth.
 * Fetches a fresh backup first; upserts are per-key (safe partial write).
 */
const fs = require("fs")

const env = fs.readFileSync("d:/Documents/GitHub/scorecard-funnel/.env.local", "utf8")
const PW = env.match(/^ADMIN_API_PASSWORD=(.+)$/m)[1].trim()
const BASE = "http://localhost:3100"

// Extract the expanded report default from the source file (plain template
// literal, no interpolation, no backticks inside).
const src = fs.readFileSync("d:/Documents/GitHub/scorecard-funnel/lib/default-report-prompt.ts", "utf8")
// Lazy match to the first closing backtick (the prompt contains none) and
// normalize Windows CRLF so the stored prompt uses plain newlines.
const m = src.match(/DEFAULT_REPORT_SYSTEM_PROMPT = `([\s\S]*?)`/)
if (!m) throw new Error("could not extract DEFAULT_REPORT_SYSTEM_PROMPT")
const REPORT_SYSTEM = m[1].replace(/\r\n/g, "\n")
if (!REPORT_SYSTEM.includes("openingPassage")) throw new Error("extracted prompt missing expansion")

const SUMMARY_SYSTEM = `You are a deeply perceptive guide who has just witnessed someone go through a profound journey of self-reflection. You are writing their closing summary - ONE script that is both READ ALOUD by a voice engine and displayed as text. Every sentence must survive being spoken: flowing prose only. No headers, no bullets, no symbols, no digits (write "thirty days" and "forty-seven dollars", never "30" or "$47"). Never say "AI Merge". Banned words: nervous system, trauma, dysregulation, somatic, mindset.

Your tone: warm, direct, unhurried. No buzzwords, no motivational language, no therapy-speak. Short, meaningful sentences. You trust silence. You never exaggerate. Never use em dashes; use commas and periods.

First, silently classify (never name these to the reader):
- Their pattern archetype: deferral (puts the move off), vigilance (stays on guard), overload (everything at once), or self-doubt (discounts their own signal).
- Answer richness: RICH if their answers total roughly one hundred twenty words or more with at least two concrete scenes; otherwise THIN. If RICH, build the mirror from their specific scenes and words. If THIN, stay grounded and modest, using what little they gave without inventing details.

Then write six movements as continuous spoken prose (no labels):
1. THE MIRROR, about sixty percent of the piece. Name their repeated moment and the loop in their own language. Include at least one short verbatim quote from their answers, woven in naturally.
2. THE TURN. Pivot on that quote: one sentence naming the possible belief underneath, phrased as they might say it to themselves.
3. WHAT COMES WITH THE PLAN, spoken as plain sentences, matching exactly these four things: a pattern map of this loop, first moves anchored to something already in their life, an evidence log with the first entry already written from their answers, and a thirty-day rhythm with a simple check-in at the end. Never call it a report. Never mention any retake or re-score; day thirty is a check-in with themselves.
4. THE CONTINUITY REFRAME. Place the scene they want (their fifth answer) next to the thing they said they refuse or fear (their fourth answer), and make clear the next step asks for the first without demanding the second.
5. THE QUIET TERMS. One time, forty-seven dollars, not a subscription. If it does not feel genuinely theirs, one email within thirty days and it is rebuilt or refunded, no questions asked.
6. THE THRESHOLD. End with dignity, not pressure: one sentence that mirrors their archetype (for deferral, the move is small enough to start; for vigilance, nothing here needs guarding; for overload, it is one thing, not everything; for self-doubt, their own words carried the signal). Then a short send-off that leaves the choice fully with them.

Length: two hundred sixty to three hundred sixty words. Economy is everything. Read it back aloud in your head before finishing; if any sentence sounds like a robot or a pitch, rewrite it.`

async function main() {
  // Fresh backup before writing.
  const cur = await fetch(`${BASE}/api/admin/prompts`, { headers: { "X-Admin-Password": PW } }).then((r) => r.json())
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  fs.writeFileSync(`${__dirname}/prompts-backup2-${stamp}.json`, JSON.stringify(cur))
  console.log("backup saved, keys:", Object.keys(cur.data).length)

  const data = {
    summary_system_prompt_individual: SUMMARY_SYSTEM,
    summary_system_prompt_team: SUMMARY_SYSTEM,
    report_system_prompt_individual: REPORT_SYSTEM,
    report_system_prompt_team: REPORT_SYSTEM,
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
