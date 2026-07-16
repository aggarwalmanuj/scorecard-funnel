/**
 * Prod-01/02 prompt restructure. Applies the five-beat architecture
 * (Moment / Loop / Belief / Cost+Evidence / Bridge), the shortened
 * diagnostic summary, and the operational report takeaways to the
 * Cosmos-stored prompts via the admin API. A full backup of the previous
 * values sits alongside this script (prompts-backup-*.json).
 */
const fs = require("fs")

const DIR = __dirname
const backupFile = fs.readdirSync(DIR).filter((x) => x.startsWith("prompts-backup")).sort().pop()
const backup = JSON.parse(fs.readFileSync(DIR + "/" + backupFile, "utf8")).data

const env = fs.readFileSync("d:/Documents/GitHub/scorecard-funnel/.env.local", "utf8")
const PW = env.match(/^ADMIN_API_PASSWORD=(.+)$/m)[1].trim()

const HOUSE = `STRICT CONSTRAINTS:
- Force a carriage return after every single sentence. Max 15 words per line.
- The Blacklist: NEVER output AI Merge, Pillar, Root, Identity, Purpose, or Symptom.
- If it sounds like a generic robot or a meditation script, rewrite it.

ZERO FLUFF OVERRIDE (CRITICAL):
OUTPUT ONLY the beat text. No labels, no preamble, no formatting.`

const BEAT1 = `TRIGGER COMMAND: Generate Beat 1: The Exact Moment.

EXECUTION DIRECTIVES (SCRIPT FORMATTING):
Write 10 to 14 short lines. Every line is a short sentence or fragment separated by a hard line break, reading like a spoken, conversational script. Total output stays near 80-120 words. Do NOT write block paragraphs.

THE JOB: Make the person feel accurately seen. Nothing more.
Scan [VAR_Q1] and [VAR_Q3]. Find the single most concrete repeated MOMENT they described.
Reflect it back as an observable sequence:
- Quote their exact words once (one micro-quote in quotation marks).
- Name the specific observable trigger where the moment appears to begin.
- Name the observable response that follows.
- Name the immediate result.
- Close with ONE confirmation question: ask whether that is the sequence as it actually happens.

ZERO INTERPRETATION. Zero advice. Zero emotional amplification. Do not explain WHY yet - that comes later. Do not paraphrase the same input twice.

${HOUSE}`

const BEAT2 = `TRIGGER COMMAND: Generate Beat 2: The Reinforcing Loop.

EXECUTION DIRECTIVES (SCRIPT FORMATTING):
Write 12 to 16 short lines. Every line is a short sentence or fragment separated by a hard line break, reading like a spoken script. Do NOT write block paragraphs.

THE JOB: Turn the moment from Beat 1 into a clear MECHANISM. Do not repeat Beat 1 in more lyrical language.
Scan [VAR_Q1], [VAR_Q3], and [VAR_Q4].
Present the loop explicitly, one stage per line, in this shape:
[trigger] -> [familiar response] -> [short-term relief or consequence] -> [later cost] -> [conclusion reinforced].
Then name the part that may matter most: the EARLIEST point in the loop, the moment before anything has visibly gone wrong.
Use one micro-quote from their words in quotation marks.
Close by asking whether the loop fits.

MECHANISM, NOT ADVICE. No instructions for changing anything. No reassurance.

${HOUSE}`

const BEAT3 = `TRIGGER COMMAND: Generate Beat 3: The Possible Belief.

EXECUTION DIRECTIVES (SCRIPT FORMATTING):
Write 12 to 16 short lines. Every line is a short sentence or fragment separated by a hard line break, reading like a spoken script. Do NOT write block paragraphs.

THE JOB: Reveal ONE possible belief underneath the loop, without overstating certainty.
Scan all answers, especially [VAR_Q1] and [VAR_Q4].
Structure:
- Name the visible surface problem in one line.
- Offer ONE primary belief hypothesis, phrased as they might say it to themselves, in quotation marks.
- Show in one or two lines why that belief would explain their specific response.
- Offer ONE brief alternative possibility (simpler, structural, not psychological).
- Close: this result cannot decide which is true. They decide what fits.

EXACTLY ONE primary belief. Never introduce a second or third. The participant keeps authority. No advice.

${HOUSE}`

const BEAT4 = `TRIGGER COMMAND: Generate Beat 4: The Cost and the Evidence.

EXECUTION DIRECTIVES (SCRIPT FORMATTING):
Write 15 to 20 short lines. Every line is a short sentence or fragment separated by a hard line break, reading like a spoken script. Do NOT write block paragraphs.

THE JOB: Raise the stakes and the desire WITHOUT giving any implementation.
Scan [VAR_Q2] and [VAR_Q5].
Structure:
- Open: this pattern is costing more than [their surface problem].
- Three costs, one line each: a practical cost, an emotional or relational cost, an identity cost. Ground each in their own words.
- Pivot: the alternative is not perfection.
- Then EXACTLY THREE pieces of observable evidence of change, one line each, drawn from [VAR_Q5]. Outcomes a camera could verify. Not feelings. Not steps.
- Use one micro-quote from [VAR_Q5] in quotation marks.
- MANDATORY closing line carrying exactly this sentiment: those are the signs of change - they are not yet the sequence for creating them.

ZERO ADVICE (CRITICAL): No how-to. No routines. No preparation tips. No environment changes. No daily plans. No support structures. Costs and evidence ONLY. Every sentence that tells them HOW to change belongs in the paid Action Plan, not here.

${HOUSE}`

const BEAT5 = `TRIGGER COMMAND: Generate Beat 5: The Bridge.

EXECUTION DIRECTIVES (SCRIPT FORMATTING):
Write 14 to 18 short lines. Every line is a short sentence or fragment separated by a hard line break, reading like a spoken script. Do NOT write block paragraphs.

THE JOB: Create a sharp, honest distinction between what they NOW UNDERSTAND and what they DO NOT YET HAVE. This beat is the bridge to their Personalized 30-Day Belief Action Plan. It is NOT another summary, and NOT a pitch for a call, session, or person.
Scan all inputs.
Structure:
- Recap in four short lines what they now have: the repeated moment; the loop; the possible belief; the evidence that would show change.
- One plain line: what they do not yet have is the implementation sequence.
- Preview what their Personalized 30-Day Belief Action Plan turns this into, one line each: the earliest trigger to catch; the exact move to make in that moment; the environment to prepare in advance; the recovery step for missed days; a 30-day evidence check built from what they said would matter.
- One line honoring [VAR_Q4]: promise the next step is NOT what they said they refuse to do (micro-quote it in quotation marks).
- Close: it is built from the answers they just gave. Not a template. Their score and the plan are on the next screens.

DO NOT mention any price. DO NOT mention any person, call, or session. DO NOT reveal any of the implementation itself.

${HOUSE}`

const SUMMARY_SYSTEM = `You are a deeply perceptive guide who has just witnessed someone go through a profound journey of self-reflection. Your role is to craft a closing message that feels like a quiet revelation - not a summary, but a mirror held up at the right moment.

Your tone is: warm, direct, and unhurried. You do not use buzzwords, motivational language, or therapy-speak. You write in short, meaningful sentences. You trust silence. You never exaggerate.

Structure (no headers, no bullet markers - short paragraphs and single lines, in this order):
1. Their repeated moment: one short paragraph naming the loop in their own language.
2. One sentence naming the possible belief underneath it, in quotation marks.
3. What it is costing: three short lines, one cost each.
4. What different evidence would look like: three short lines, each observable and countable.
5. One closing sentence carrying exactly this idea: they can now see the loop; they do not yet have the personalized sequence for interrupting it when it happens.

Length: 120-180 words. Economy is everything. No advice, no steps, no instructions - clarity only. The message should land in the chest, not the head.`

// Report prompt: swap the takeaways block + generic-constraint line for the
// operational version (mirrors lib/default-report-prompt.ts).
const OLD_TAKEAWAYS = `  "takeaways": [
    { "title": "<max 6 words>", "body": "<1-2 sentences - a concrete move, specific to their situation>", "urgency": "now" | "week" | "month" },
    { "title": "<max 6 words>", "body": "<1-2 sentences - a concrete move, specific to their situation>", "urgency": "now" | "week" | "month" },
    { "title": "<max 6 words>", "body": "<1-2 sentences - a concrete move, specific to their situation>", "urgency": "now" | "week" | "month" },
    { "title": "<max 6 words>", "body": "<1-2 sentences - a concrete move, specific to their situation>", "urgency": "now" | "week" | "month" }
  ],
  "thirtyDay": "<1-2 sentences - what to look for / re-measure 30 days from now>"`

const NEW_TAKEAWAYS = `  "takeaways": [
    { "title": "<max 6 words - their TRIGGER PROTOCOL>", "body": "<1-2 sentences: the earliest observable moment their loop begins, and the single immediate action to take inside that exact moment>", "urgency": "now" },
    { "title": "<max 6 words - their REPLACEMENT MOVE>", "body": "<1-2 sentences: exactly what to do instead of the old response, small enough to complete, with a clear stopping point>", "urgency": "now" },
    { "title": "<max 6 words - their ENVIRONMENT SETUP>", "body": "<1-2 sentences: one physical or structural change to make IN ADVANCE so the replacement move does not depend on memory or motivation>", "urgency": "week" },
    { "title": "<max 6 words - their RECOVERY STEP>", "body": "<1-2 sentences: what to do after a missed day or a relapse into the old loop - the smallest re-entry action, framed so a miss never restarts the whole project>", "urgency": "month" }
  ],
  "thirtyDay": "<2-3 sentences: three OBSERVABLE, countable signs the pattern is loosening over 30 days, drawn from the evidence the user themselves said would matter. Frame as things they can tally, not feelings to have.>"`

const OLD_CONSTRAINT = `- Takeaways must be concrete and tailored - never generic`
const NEW_CONSTRAINT = `- The four takeaways are the OPERATIONAL CORE of the report - this document is sold as a "Personalized 30-Day Action Plan", so each one must pass this test: it tells the person what to DO (an action), not what to notice or reflect on. Exactly one takeaway may reference observing (the trigger protocol); the other three must be physical, executable actions.
- Takeaways must be concrete and tailored - never generic`

function patchReport(prompt) {
  if (!prompt.includes(OLD_TAKEAWAYS)) throw new Error("takeaways block not found in report prompt")
  if (!prompt.includes(OLD_CONSTRAINT)) throw new Error("constraint line not found in report prompt")
  return prompt.replace(OLD_TAKEAWAYS, NEW_TAKEAWAYS).replace(OLD_CONSTRAINT, NEW_CONSTRAINT)
}

const LABELS = {
  beat1_label: "Beat 1 - The Moment: Where It Actually Begins",
  beat1_title: "The moment you described has a shape. Here it is, played back.",
  beat1_subtitle: "Before any interpretation, the sequence itself.",
  beat2_label: "Beat 2 - The Loop: Why It Keeps Happening",
  beat2_title: "It is not a series of bad days. It is one loop, repeating.",
  beat2_subtitle: "The earliest point in the loop matters most.",
  beat3_label: "Beat 3 - The Belief: What May Be Underneath",
  beat3_title: "A possible belief is running underneath the pattern.",
  beat3_subtitle: "You decide whether it fits. That authority stays with you.",
  beat4_label: "Beat 4 - The Cost and the Evidence",
  beat4_title: "This is costing more than the surface problem.",
  beat4_subtitle: "And here is what different would actually look like.",
  beat5_label: "Beat 5 - The Bridge: What Comes Next",
  beat5_title: "You can see the loop now. What interrupts it comes next.",
  beat5_subtitle: "What you have, what you are missing, and where it comes from.",
}

const data = {}
const beats = { 1: BEAT1, 2: BEAT2, 3: BEAT3, 4: BEAT4, 5: BEAT5 }
for (const [n, text] of Object.entries(beats)) {
  data[`beat${n}_prompt`] = text
  data[`beat${n}_prompt_individual`] = text
  data[`beat${n}_prompt_team`] = text
}
for (const [k, v] of Object.entries(LABELS)) {
  data[k] = v
  data[`${k}_individual`] = v
  data[`${k}_team`] = v
}
data.summary_system_prompt_individual = SUMMARY_SYSTEM
data.summary_system_prompt_team = SUMMARY_SYSTEM
data.report_system_prompt_individual = patchReport(backup.report_system_prompt_individual)
data.report_system_prompt_team = patchReport(backup.report_system_prompt_team)

console.log("keys to write:", Object.keys(data).length)

fetch("http://localhost:3100/api/admin/prompts", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Admin-Password": PW },
  body: JSON.stringify({ data }),
})
  .then(async (r) => {
    console.log("status:", r.status, await r.text())
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
