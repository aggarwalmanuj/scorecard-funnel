# Adding a new funnel vertical

A complete, repeatable playbook for wiring a new audience (its own landing page,
its own copy, its own AI prompts, its own PDF) into this funnel.

Written after shipping **coaches** (2026-08-04), which is the reference
implementation — every step below points at a real diff you can copy.

Existing verticals: `main`, `retargeting`, `adhd`, `healthcare`, `coaches`.

---

## 0 · The paste-ready prompt

Copy this into a fresh session, fill the four slots, and let it run. Everything
after this section is the detail it needs.

> We are adding a new vertical to the scorecard funnel.
>
> - **Vertical id:** `<short-lowercase-id, e.g. traders>`
> - **Public name:** `<the exact product name the landing page's CTA says>`
> - **Landing page repo:** `<local path>`
> - **Source docs:** `<local path to the Landing-Page / VSL / ICP / Ad matrix docs>`
>
> Follow `docs/ADDING-A-VERTICAL.md` end to end. Specifically:
>
> 1. Audit the landing page against the parity checklist in §2 and report any
>    gaps before touching the funnel. Do not fix its repo without asking.
> 2. Read the source docs and extract the register rules, the public mechanism,
>    the naming law, and every forbidden claim for this audience. Quote them
>    back to me before writing copy.
> 3. Register the vertical (§3) — the alias for the landing page's `lp=` slug is
>    the single most important line; without it, paid traffic silently runs the
>    main funnel.
> 4. Author the content pack (§4) and seed it (§5). **Use `--db=scorecard`** —
>    `.env.local` points at a non-live database.
> 5. Verify locally (§6), then run the live end-to-end check (§7) and report
>    the results.
>
> This is a paid product with live ad spend. No invented statistics, no
> guarantees, no urgency, and no em dashes in any rendered copy.

---

## 1 · What you need before starting

| Input | Why |
|---|---|
| The landing page repo (local path) | You must read its `lib/scorecard.ts` for the exact `lp=` slug it sends |
| The vertical's source docs | Landing Page + VSL + ICP Matrix + Ad Matrix. These carry the register rules, the public mechanism, and the banned claims. Copy written without them will violate something |
| The deployed LP domain | Confirms whether the subdomain belongs to the LP or the funnel |
| Cosmos credentials | `.env.local` has them — but see the database trap in §5 |

Read the source docs **first**. Every vertical has non-obvious hard rules
(healthcare: no PHI, roles-not-people; adhd: no systems/streaks/discipline;
coaches: belief is never the sole cause of a business outcome). These are
compliance and trust rules, not tone preferences.

---

## 2 · Audit the landing page first

The LP is usually built by someone else. Verify it before you build anything,
because a missing param here silently destroys attribution for the whole
vertical.

### 2.1 Hand-off parity

Diff its `lib/scorecard.ts` against the three known-good ones:

```bash
cd "D:/Documents/GitHub Desktop"
for d in adhd-new B2B-Funnel Retargeting-LandingPage <NEW-LP>; do
  echo "===== $d ====="
  grep -n "fbp\|fbc\|ref:\|lp:\|utm_\|SCORECARD_BASE_URL =\|LP_SLUG =" "$d/lib/scorecard.ts"
done
```

`buildScorecardUrl()` must set **all** of:

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- `fbclid`, `gclid`, `ttclid`, `msclkid`
- `fbp`, `fbc` (read from cookies)
- `ref` — a stable first-party visitor id, persisted in localStorage
- `lp` — **the slug. Write it down; §3 depends on it.**

Also confirm:

- `SCORECARD_BASE_URL` is overridable via `NEXT_PUBLIC_SCORECARD_BASE_URL`, so
  dev clicks don't create live leads.
- First touch wins, **except** a record with no campaign data is upgraded by a
  later ad click. Without that exception an organic visit permanently
  unattributes the paid click that converted.
- The CTA is a same-tab anchor with **no** `rel="noreferrer"` — the funnel uses
  the referrer as a secondary signal.

### 2.2 Live checks

```bash
# every route + a deliberate 404
for p in "" faq glossary privacy terms ai-data-disclosure \
         professional-disclaimer accessibility llms.txt robots.txt \
         sitemap.xml nonexistent-page; do
  echo "/$p -> $(curl -s -o /dev/null -w '%{http_code}' "https://<lp-domain>/$p")"
done
```

Then drive a browser over it (see `§7` for the harness shape) and check:

- **No horizontal overflow** at 320 / 375 / 390 / 430 / 768 / 1440.
- **Every CTA** carries the full param set. Enumerate with
  `a[data-cta-location]` and parse each `href`.
- **Banned-claims sweep** against that vertical's spec. For coaches the spec
  forbade publishing a question count or completion time until measured; other
  verticals ban different things. Always sweep for: guarantees (outside
  disclaimers), income claims, urgency/scarcity/countdowns, and any invented
  statistic.
- **Zero em dashes** in rendered copy (site rule).
- No wrong-vertical VSL or testimonial left over from a copied repo.

Report gaps. Do not edit another team's repo without asking.

---

## 3 · Register the vertical

TypeScript forces most of this: adding the id to `VERTICALS` breaks the build
until every `Record<Vertical, …>` map is filled. That is deliberate — it is the
safety net. Run `npx tsc --noEmit` after step 3.1 and let it drive you.

### 3.1 `lib/verticals.ts`

```ts
export const VERTICALS = [..., "<id>"] as const

export const VERTICAL_LABELS: Record<Vertical, string> = { ..., "<id>": "<Label>" }

const VERTICAL_ALIASES: Record<string, Vertical> = {
  ...,
  // THE CRITICAL LINE. This is the slug the landing page sends as `lp=`.
  // Without it, normalizeVertical() returns null, the funnel falls through to
  // `main`, and every paid click runs the consumer funnel with consumer copy.
  "<lp-slug-from-§2.1>": "<id>",
  // plus any plausible spelling and the deployed subdomain label
}
```

Also update the `verticalFromHost` doc comment with the subdomain.

> **Note:** the subdomains (`adhd.aimerge.live`, `coaches.aimerge.live`, …) are
> owned by the **landing pages**, not the funnel. `verticalFromHost` is a
> fallback for hosts the funnel actually serves. `lp=` is the real mechanism.

### 3.2 `lib/vertical-display.ts` — `VERTICAL_DISPLAY`

The compiler will demand a full `VerticalDisplay`. Decisions that matter:

- **`productName`** — must be **verbatim** the landing page's CTA string. The
  funnel renders `Get Your Free {productName}`. Healthcare once shipped with
  two names for one thing and it cost conversions at the moment of highest
  doubt. Read the comment above the healthcare entry before choosing.
- **`reportName`** — the paid artifact. Appears in the PDF header and in every
  page footer (`{reportName} · Page N of M`). **Keep it short** — anything past
  ~35 characters risks overflowing the footer.
- **`pillarLabels`** — the four subscore keys (`directionClarity`,
  `identityAlignment`, `decisionReadiness`, `energyAlignment`) are a **fixed
  technical contract** across scoring, storage, charts and the LLM JSON.
  Never rename them. Only relabel what they *mean* to this reader — and keep
  the labels in sync with the score prompt's rubric in §4.
- **`measureNoun` / `measureNounPlural`** — "pillar" for consumer register,
  "dimension" for operational/B2B.
- **`howToRead`** — the orientation page. Must survive a reader who skipped the
  whole funnel. The glossary should define this vertical's public mechanism.
- **`offerVariant`** — `"b2c"` ($47 offer page) or `"b2b"` (structurally
  different page, `components/challenge/b2b-offer-screen.tsx`).
- **`offerAccent`** — optional. Use it to answer the dominant purchase fear for
  this audience, taken from the source docs.

### 3.3 `lib/report-gamification.ts` — `BOARD_CONFIG`

The 30-day board in the paid PDF. Hard rules in the file header: no streaks, no
dates, nothing expires, no ranking. Spread `B2C_BOARD` and override, or write a
`variant: "evidence-loop"` entry for a B2B register.

Repurposing the second counter row is allowed if the vertical's mechanism calls
for it — coaches turned "Returns" into "Evidence" (completed commercial
actions) — but the anti-shame guarantee must survive in `catchesRule` and
`closingLine`.

### 3.4 `components/challenge/funnel-exit-intent.tsx` — `EXIT_COPY`

Two `facts` rows, a source line, and stage-specific closing lines.

**If you have no published figure for this audience, do not invent one.** Use
non-numeric figures — `retargeting` and `coaches` both do this
(`"Saved"`, `"One moment"`).

### 3.5 `lib/offers.ts` — only if B2B

The **one** hardcoded vertical branch left in the codebase:

```ts
if (vertical === "healthcare") return B2B_UPSELL
```

A new B2C vertical inherits the consumer ladder automatically. A new B2B
vertical must extend this line and needs its own Stripe Payment Link env var.

### 3.6 Nothing else needs touching

`/admin` tabs, the entry page, the offer router, attribution namespacing and the
middleware are all registry-driven. Verify with:

```bash
grep -rn 'Record<Vertical\|Record<Audience' --include="*.ts" --include="*.tsx" . \
  --exclude-dir=node_modules --exclude-dir=.next
grep -rn '=== "main"\|!== "main"' --include="*.ts" --include="*.tsx" app components lib
```

Every `=== "main"` is correct as-is for a new vertical.

---

## 4 · Author the content pack

Create `belief-score-config/belief-score-config-<id>.json`. Read
`belief-score-config/CONFIG-GUIDE.md` first — it explains every field.

**Author it with a generator script**, not by hand. Hand-escaping `\n` and
quotes inside 15,000-character prompts is where mistakes hide:

```js
// scratchpad/gen-<id>-config.mjs
const systemPrompt = `...multi-line, readable...`
writeFileSync(out, JSON.stringify(config, null, 2) + "\n", "utf8")
```

### 4.1 Field-by-field traps

| Field | Trap |
|---|---|
| `audience` | Must equal the vertical id, or the seed script refuses it |
| `entryContent.ctaLabel` | Verbatim the LP's CTA. Verify against the spec's own CTA rules — some specs sanction a short form for buttons |
| `entryContent.subcopy` | Check the spec before stating a question count or a duration. The coaches spec forbids publishing a completion time until measured |
| `entryContent.showVideo` | `false` when the traffic already saw a VSL on the ad side |
| `systemPrompt` | **Must contain `{{Q1}}`–`{{Q5}}`.** If it doesn't, `buildSystemPrompt` appends a raw-answers block as a safety net — it works, but it means your prompt isn't delivering the answers. This has shipped broken to production before |
| beat prompts | Reference answers as `[VAR_Q1]`…`[VAR_Q5]`. `resolveVarTokens` substitutes them, so the model can never echo a placeholder |
| `beats[].userPrompt` | The seed script maps **`userPrompt`** → `beatN_prompt`. A field named `prompt` is **silently ignored** (healthcare's file has a dead one) |
| `questions` / `beats` | Exactly 5 each, in order. Order is meaning: Q1 the moment, Q2 the belief, Q3 the cost, Q4 the hard no, Q5 the desired future |
| `scoreSystemPrompt` | Keep the four subscore keys and the six `nsState` values exactly. Keep the conservative bands (mean ≈ 48) — loosening them inflates everyone and kills the benchmark |
| `reportSystemPrompt` | B2C verticals need the **full** JSON shape (`evidenceLog`, `scoreFraming`, `startHere`, `firstMove`, `dailyLine`, `shareableLine`, `lockScreenLine`, `rhythm`, `openingPassage`, `companions`) or those PDF sections render empty. B2B uses a reduced shape. Copy the shape from an existing same-variant vertical |
| report length | The report route budgets `maxTokens: 5200`. A much richer prompt overruns it, the JSON truncates mid-string, parsing fails and **the buyer receives nothing** |

### 4.2 Copy rules that apply to every vertical

- No invented statistics, percentages, dollar figures, or outcome guarantees.
- No urgency, scarcity, countdowns, or deadlines.
- **No em dashes** anywhere in rendered copy — use ` - `. (Internal docs like
  this one are exempt.) Verify with Node, not grep: `grep $'—'` silently
  returns **zero matches** in Git Bash even when the file is full of them.

  ```bash
  node -e "const t=require('fs').readFileSync(process.argv[1],'utf8');
    console.log((t.match(/—/g)||[]).length)" <file>
  ```

  Check the *rendered* HTML too, not just source — DB-driven copy counts.
- Beats quote 1–2 verbatim fragments (2–5 words) of the respondent's own words.
- A safety override outranking everything: crisis material routes to human
  support instead of continuing the sequence.

Leave a field **empty** to inherit main's. That is the whole point of the
inheritance chain — don't duplicate main's text, it goes stale.

### 4.3 Register it with the seeder

`scripts/seed-vertical-content.mjs` → add the id to `KNOWN_VERTICALS`.
Then add a cheat-sheet entry to `belief-score-config/CONFIG-GUIDE.md`.

---

## 5 · Seed it — read this before running anything

**The Cosmos account holds ~10 databases. The live site reads `scorecard`.
`.env.local` sets `COSMOS_DATABASE=test`.**

A seed run with `.env.local` alone writes to `test`, prints
`Done. Wrote 39 keys.`, and touches nothing the live site serves. It looks
exactly like success. This cost a full round-trip when shipping coaches.

```bash
# 1. dry run — confirm the key list AND the target database banner
node --env-file=.env.local scripts/seed-vertical-content.mjs \
  --db=scorecard belief-score-config/belief-score-config-<id>.json

# 2. apply
node --env-file=.env.local scripts/seed-vertical-content.mjs \
  --apply --db=scorecard belief-score-config/belief-score-config-<id>.json
```

A complete pack is **39 keys**. Verify against a known-good vertical:

```js
// count keys per vertical in the live DB
const { resources: ids } = await db.container("prompts")
  .items.query("SELECT VALUE c.id FROM c").fetchAll()
// every seeded vertical should show 39
```

Seeding is **additive and safe** — keys are namespaced `<base>_<id>`, nothing
existing is touched, and nothing reads them until the code deploys. Seeding
before deploy is fine.

The alternative path is `/admin` → the vertical's tab → **Import** → the JSON →
**Save changes**, which also busts the 5-minute server prompt cache immediately.

---

## 6 · Verify locally

```bash
npx tsc --noEmit          # must be clean — this is what proves every map is filled
npx next build            # must be clean
npx next dev -p 3100      # port 3000 is usually held by another checkout
```

Then:

```bash
# entry page resolves and serves the vertical's copy, server-side
curl -s "http://localhost:3100/challenge/audience?lp=<lp-slug>" \
  | tr '<' '\n' | grep -i "your <public name>"

# per-vertical questions and beats are actually served
curl -s "http://localhost:3100/api/admin/question-prompts?audience=<id>" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);
      console.log(j.questions[0].stageFraming, '|', j.beats[4].label)})"

# main is untouched
curl -s "http://localhost:3100/api/admin/question-prompts?audience=main" | head -c 200
```

Attribution check — drive a browser to
`/challenge/audience?lp=<slug>&utm_source=meta&fbclid=…&ref=…` and read back
`localStorage`. You must see a single key `ufa_attribution:<id>` containing every
param plus `vertical: "<id>"`. If it landed under `ufa_attribution:main`, the
alias in §3.1 is missing.

Mid-funnel routes (`question-*`, `beat-*`, `offer`) are client-gated by the
funnel guard, so `curl` shows an empty shell for every vertical — that is normal,
not a regression. Verify those in a browser.

---

## 7 · Verify live, end to end

Do this before spending a rupee on ads. It creates one real lead row and burns
AI credits — that is the point.

Drive Playwright (`playwright-core` is already a dependency; the Chromium binary
lives under `%LOCALAPPDATA%\ms-playwright`) through the whole path:

1. Load the **live LP** with a realistic ad query string (`utm_*`, `fbclid`).
2. Dismiss the cookie banner. **Do this on the funnel too** — the funnel's
   banner is fixed to the bottom and overlaps the entry CTA at desktop heights.
3. Read `localStorage` on the LP: `hf-first-touch` and `aimerge-ref`.
4. Enumerate `a[data-cta-location]`, parse every `href`, assert the full param
   set on each.
5. Click the hero CTA. Assert you land on `/challenge/audience` with the params
   intact, and that `ufa_attribution:<id>` is written.
6. Sign up with a taggable address (`qa+<timestamp>@…`) so the row is findable.
7. Answer Q1–Q5 with **realistic, messy, ICP-accurate** answers that include a
   genuine practical constraint — that is what exercises the register rules.
8. Let each beat finish streaming (poll until page text stops growing), then
   click a feedback option.
9. Let processing → summary → score complete. Capture the text.
10. Reach the offer page. Capture the text.

Then audit what came back:

- **No `[VAR_Qn]` or `{{…}}` tokens anywhere.**
- No banned vocabulary for this vertical (build the list from the source docs).
- Zero em dashes.
- Beats quote real fragments of the answers.
- Legitimate constraints the respondent named are preserved, not reframed away.
- Correct product name everywhere; the offer accent renders.

Finally, confirm the row persisted completely by querying the live DB directly:

```
question1..5, question1..5_text, beat1..5_output, beat1..5_feedback,
score_json, summary_text, report_json, offer_viewed_at,
utm_*, fbclid, ref, lp, vertical, referrer, landing_page
```

Any `*** MISSING ***` is a failed write worth chasing. And check `/admin`:
the new tab renders, its content tabs load the seeded copy, and the row is
searchable and tagged with the vertical.

---

## 8 · Shared surfaces a new vertical inherits

These are **not** per-vertical today. A new vertical gets them whether they fit
or not — check them against your register and raise them rather than assuming:

| Surface | What it hardcodes |
|---|---|
| `components/challenge/offer-screen.tsx:310` | "Personalized 30-Day **Belief Action Plan**" — shown to every B2C vertical regardless of its `reportName` |
| `components/challenge/offer-screen.tsx:457` | "Less than a single coaching session." |
| `components/challenge/offer-screen.tsx` FAQ | "Is this therapy or a diagnosis?" — off-register for a B2B or professional audience |
| `app/admin/page.tsx:144` | Renders the scoring engine's built-in labels ("Direction Clarity / Purpose"), not the vertical's. Internal only; the buyer-facing report and summary both override correctly |
| `lib/offers.ts` upsell ladder | Consumer narrative offers ($497 Story Session / $1,997 Deep Work) for every non-healthcare vertical |

---

## 9 · Quick reference — the coaches diff

```
lib/verticals.ts                                   +21   registry, label, aliases
lib/vertical-display.ts                            +87   names, pillars, howToRead, offer
lib/report-gamification.ts                         +43   30-day board
components/challenge/funnel-exit-intent.tsx        +26   exit copy
scripts/seed-vertical-content.mjs                  +29   KNOWN_VERTICALS, --db flag
belief-score-config/belief-score-config-coaches.json     39 keys of content
belief-score-config/CONFIG-GUIDE.md                +5    cheat-sheet entry
```

Roughly 200 lines of code and one content pack. The code is the easy half; the
content pack and the live verification are where the time goes.
