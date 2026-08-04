# Vertical Config Guide — what every field means

This guide explains the JSON config files in this folder (`belief-score-config-adhd.json`, `belief-score-config-healthcare.json`, `belief-score-config-coaches.json`, `belief-score-config-retargeting.json`, and the main export). Each file is the complete "content brain" of one vertical: everything a visitor reads, and every instruction the AI follows, from the name-gathering page through the paid report.

**Who edits what:** the copy-like fields (questions, hints, titles, entry-page text) are safe for anyone to edit. The AI-instruction fields (prompts) are editable too, but they contain structural rules the funnel depends on — the guide marks what to change freely and what to leave alone.

---

## How changes go live

1. **Admin panel (recommended):** open `/admin`, pick the vertical's tab, use **Import** to load a JSON file into the editor, review, then **Save changes**. Nothing touches the live site until Save.
2. **Seed script (engineering):** `node --env-file=.env.local scripts/seed-vertical-content.mjs --apply <file>` — accepts partial files and skips empty fields.

**The inheritance rule (important):** any field left **empty** in a non-main vertical automatically serves the **Main** vertical's content at runtime. So a vertical file only needs to contain what is *different* about that audience. This is why the retargeting file is tiny — by design, returning visitors get the same product as main, with only the entry page re-voiced.

**One law above all (the One-Name Law):** each vertical has exactly ONE product name, used everywhere — "Belief Score" (main), "ADHD Belief Score", "Belief Profile" (business). Never introduce a second name for the deliverable inside any copy field; it is the single most damaging inconsistency for conversion ("I'm not sure what I get").

---

## Top-level fields

| Field | Meaning |
|---|---|
| `exportedAt` | Timestamp of the export. Informational only. |
| `version` | Config format version. Leave as `3`. |
| `audience` | The vertical this file belongs to: `main`, `adhd`, `healthcare`, `coaches`, or `retargeting`. **Do not change** — it decides which audience receives this content. |

---

## `entryContent` — the name-gathering page

The first page a visitor from this vertical's ads sees (e.g. on `adhd.aimerge.live`). Pure display copy — no AI involved.

| Field | Where it appears | Notes |
|---|---|---|
| `eyebrow` | Small uppercase line above the headline | e.g. "I · Your ADHD Belief Score" |
| `headline` | First (upright) headline line | Keep short — it pairs with the accent line |
| `headlineAccent` | Second (italic) headline line | The two lines read as one sentence |
| `subcopy` | Paragraph under the headline | Must carry the honest spec: free, 5 questions, ~10 minutes, no card. For healthcare it must keep the **no-PHI instruction** ("do not include patient identifiers") — that line is a compliance requirement, not marketing. |
| `ctaLabel` | The button | Per the doorway rules: **"Get Your Free [Product Name]"**, never varied |
| `showVideo` | true/false | Whether the founder orientation video shows under the form. Off for ADHD and healthcare (their traffic already saw a VSL on the ad side). |

---

## `systemPrompt` — the AI's persona for the five reflections

This is the "operating system" the AI runs while writing the five personalized reflections (called **beats**) the user reads after answering. It is the most sensitive field in the file. Its sections:

- **System role & identity** — who the AI is for this audience (a personal mirror for ADHD; a professional operational mirror for business). *Tone edits fine; role changes = discuss with engineering.*
- **Core architecture / analytical frame** — the diagnostic model (the pillars; for business, the operating-assumption frame). *Edit the detection cues (the phrases that signal each pattern) to match your ICP's language — this is exactly where ICP tuning belongs.*
- **The register rules** — hard behavioral guarantees, e.g. for ADHD: never shame, never prescribe systems/streaks, no medical claims; for business: roles-not-people, no psychology vocabulary, no invented numbers. **Do not weaken these** — they implement the conversion strategy's trust rules and, for healthcare, compliance posture.
- **User data variables** — the lines mapping `{{NAME}}`, `{{Q1}}`…`{{Q5}}` to meanings. The double-curly tags are **merge fields**: the system replaces them with the user's real name and answers at runtime. **Never delete, rename, or translate anything inside `{{ }}`.** You *may* edit the descriptive text after each variable (what Q1 "means") — and should, if you change the questions.
- **Output rules** — sentence length caps, the quoting rule (the AI must quote 2-4 word fragments of the user's own words), formatting bans. *Leave intact; they are what makes the output feel personal rather than templated.*
- **The blacklist** — words the AI must never output (internal jargon like "Pillar", hype words like "unlock", and per-vertical additions like "lazy/willpower/discipline" for ADHD). *Add words freely; remove with care.*
- **The 5-beat horizon** — the emotional arc of the five reflections (witness → the belief underneath → why the loop holds → the future → the next step). *The arc is load-bearing; re-voice the descriptions, keep the sequence.*

---

## `questions` — the five questions (exactly 5, order matters)

Each object is one full question page. **Order is meaning**: question 1 becomes `{{Q1}}` everywhere in the prompts, and the whole system assumes the arc — 1 the moment/weight, 2 the belief/knot, 3 the cost, 4 the hard no (what they refuse/what failed), 5 the desired morning. If you change what a question asks, update every prompt that describes that variable.

| Field | Where it appears |
|---|---|
| `stageFraming` | Small stage label at the top, e.g. "Stage 1 · The Repeated Moment" |
| `question` | The big serif question itself |
| `prompt` | The paragraph under it that coaches *how* to answer — the biggest lever for answer quality, which drives everything downstream (better answers → better score signal → better report) |
| `hintBox` | The "Tip:" box — one practical nudge |
| `placeholder` | Grey text inside the empty answer box — give them a first phrase to complete ("The last time this happened was...") |
| `quoteZone` | The aphorism-style line beside/below the question — sets mood, makes no claims |

**ICP tuning happens here most of all**: the examples inside `prompt` ("The deadline rescued at 2am. The reply you drafted six times…") are what make a visitor feel "this is about me." Swap the examples for your ICP's actual scenes; keep the question's role in the arc.

---

## `beats` — the five reflections (exactly 5)

Each beat has two kinds of fields:

**Display fields (safe to edit):**
- `label` — the beat's nav/label line, e.g. "Beat 3 - The Reinforcing Loop: Why It Keeps Proving Itself"
- `title` / `subtitle` — the headline pair shown above the AI's text
- `feedbackQuestion` — the confirm question under the reflection ("Does this feel accurate…?"). The user's answer feeds later prompts, so keep it a yes/partly/no-style check.

**AI fields (edit tone, keep mechanics):**
- `systemContext` — this beat's specific mission (e.g. "witness only, no advice yet"). The no-advice/no-reframe staging between beats is deliberate; moving revelations earlier flattens the arc.
- `userPrompt` — the detailed writing instructions: line counts ("20 to 25 short lines"), which `{{ }}` variables to scan, the micro-quote requirement, the beat-specific blacklist, and the closing "OUTPUT ONLY the beat text" override. **Keep**: the line-break/line-count directives (they create the spoken-script feel), the micro-quote rules (they prove listening), the blacklists, the zero-fluff override. **Edit**: the emotional content, the examples, the register.

---

## `scoreSystemPrompt` / `scoreUserPrompt` — how the score is computed

The score prompt is a strict grading rubric the AI applies to the five raw answers.

- **The four dimension KEYS are a fixed technical contract**: `directionClarity`, `identityAlignment`, `decisionReadiness`, `energyAlignment`. They flow into storage, charts, and the report. **Never rename them in the JSON output block.** What each key *means* is re-defined per vertical in the rubric text (for business, `identityAlignment` is scored as "ownership clarity") and the on-screen label is set separately in code — so tune the meaning, not the key.
- **The bands** (HIGH/MODERATE/LOW with score ranges) are the calibration. The conservative anchors ("most real answers land 30–65", "thin answers score 25–40") keep scores honest and the paid report's "room to move" real. Loosening them inflates everyone's score and kills the benchmark's meaning.
- **`nsState`** must stay one of the six listed values — it's stored and displayed as-is.
- The **OUTPUT block** ("STRICT JSON ONLY…") is machine-parsed. Do not alter its shape, only the rubric prose above it.
- `scoreUserPrompt` just delivers the answers with `{{Q1}}`…`{{Q5}}` — edit only the one-line descriptions of each question if you changed the questions.

---

## `reportSystemPrompt` / `reportUserPrompt` — the paid PDF's author

Writes the full Action Plan/report the buyer downloads. Same deal as the score:

- The big **JSON shape** (headline, thread, pillars[], themes[], beats[], takeaways[], thirtyDay) is machine-rendered into the designed PDF. **Keep every field name and count**; edit the instructions inside the `<angle brackets>` and the constraint list.
- The **constraints list** at the bottom is your quality bar: quotes must come from the user's real words, banned generic takeaways ("be intentional"), name used at most once, English only. Add ICP-specific bans here (this is a great management lever).
- Register rules per vertical live here too — ADHD's "no systems/streaks, takeaways must survive being skipped"; healthcare's "roles not people, hypothesis framing, no invented statistics." These mirror the strategy docs; keep them.
- `reportUserPrompt` feeds `{{Q1}}`–`{{Q5}}` and `{{BEAT1}}`–`{{BEAT5}}` (the AI's own earlier reflections). Same tag rules.

---

## `summarySystemPrompt` / `summaryUserPrompt` — the closing message

The 3–4 paragraph closing reflection on the summary page (also read aloud by the voice feature). Structure requirements (paragraph count, word range, "name at most once", no headers) are layout-driven — the page renders it as a designed letter. The highest-leverage line in the B2C versions: the instruction to deploy the user's **Q5 scene against their Q4 resistance** ("the person in their Q5 morning is already them") — the strategy doc calls this the single strongest copy mechanism in the funnel. Don't remove it.

---

## Golden rules (the short list for editors)

1. **It must stay valid JSON.** Quotes inside text need `\"`, line breaks are `\n`. If unsure, edit in the admin panel instead — it handles escaping for you.
2. **Never touch anything in `{{double curly braces}}`.**
3. **Exactly 5 questions and 5 beats, in order.** Order = meaning.
4. **Never rename keys** (field names, subscore keys, nsState values, report JSON shape).
5. **One product name per vertical, everywhere.**
6. **No invented statistics, no urgency/scarcity/countdowns, no outcome guarantees** — these are banned by the conversion strategy in every vertical, and for ADHD/healthcare they're also a trust/compliance matter.
7. **Empty field = inherit Main.** Delete a field's content to fall back rather than duplicating main's text (duplicates go stale when main improves).
8. **Test before shipping:** on staging, add `?vertical=adhd` to the entry URL (or use the vertical switcher on localhost) and run the funnel end to end after saving.

## Per-vertical cheat sheet

- **main** — the live tuned baseline; every other vertical inherits from it. Edit last, carefully.
- **adhd** — consumer register with hard guarantees: pattern-is-protection framing, zero shame, zero systems/streaks/discipline language, no medical claims. ICP-tune the question examples and detection cues; never loosen the register.
- **healthcare** (served at business.aimerge.live) — B2B register: operational vocabulary only, roles not people, the operating-assumption definition, the "one leader's account, built to be tested" concession, the no-PHI instruction. No consumer warmth, no psychology words, no invented numbers.
- **coaches** (served at coaches.aimerge.live, and via `lp=coaches-consultants` from the Coaches and Consultants landing page) — a commercial register for coaches, consultants, advisors, facilitators and fractional executives. Hard rules, all from the source docs: belief is NEVER the sole cause of a business outcome; real business conditions (demand, positioning, pricing, distribution, sales skill, client fit, the economy) stay real and naming one is precision, not resistance; care, depth and customization are strengths doing a second job, never faults; no invented numbers, no revenue/client/scale guarantees; never "self-sabotage", "money blocks", "scarcity mindset", "imposter syndrome", "afraid of success", or "your mindset is blocking clients". The public mechanism is the **Pattern-to-Belief Map** with exactly five stages in order — the repeated moment, the possible belief, the reinforcing loop, the moment to watch, the next evidence — and the five beats are named after them, so a visitor who watched the VSL finds all five inside their result. Every recommended move must fit inside a conversation or document they already have; never a rebuilt offer, new funnel, or new tool. The entry copy states the question count (five, which the funnel enforces) but deliberately **never** a completion time — the spec forbids publishing a duration until it has been measured.
- **retargeting** — intentionally entry-page-only. Returning visitors must meet the *same* product (no retake, no variant), with a no-pressure welcome-back voice. Resist the urge to fill this file in.
