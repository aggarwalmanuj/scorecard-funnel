# Adding a new funnel vertical

A complete, repeatable playbook for wiring a new audience (its own landing page,
its own copy, its own AI prompts, its own PDF) into this funnel.

Written after shipping **coaches** (2026-08-04) and extended on 2026-08-07 with
the two things that shipping it missed: the landing page's analytics
environment (§2.3) and attribution correctness (§2.4). Coaches is the reference
implementation — every step below points at a real diff you can copy.

Existing verticals: `main`, `retargeting`, `adhd`, `healthcare`, `coaches`.

**Read §8.1 first if you read nothing else.** Every failure this playbook exists
to prevent is silent: it prints success and produces a broken funnel.

---

## 0 · The paste-ready prompt

Fill the two required slots and paste into a fresh session in the funnel repo.
Everything after this section is the detail the agent will need; the prompt is
written so it does not need you to answer questions mid-run.

---

> Add a new vertical to the scorecard funnel, end to end.
>
> - **Landing page repo:** `<local path>`
> - **Source docs:** `<local path, or "none">`
> - Vertical id, public product name, and paid artifact name: derive them
>   yourself in Phase 1 and tell me what you chose. Do not stop to ask.
>
> Follow `docs/ADDING-A-VERTICAL.md`. Work in phases and **report at the end of
> each phase before continuing**. Do not ask me to make a decision you can make
> from the source docs or from an existing vertical's precedent — make it,
> state it, and flag it as reversible.
>
> **Context that will not be obvious from the code:**
> This is a live paid product with real ad spend. Every failure mode that has
> actually bitten us was *silent* — it printed success and produced a broken
> funnel. Assume anything you have not observed working is broken.
>
> **Phase 1 — Read before you touch anything.**
> Read the source docs in full and the landing page repo. Report back:
> the vertical id you chose; the exact public product name (must be verbatim
> the landing page's primary CTA string); the paid artifact name; the public
> mechanism and its stages; the register rules; every forbidden claim
> (invented statistics, guarantees, question counts, completion times,
> vertical-specific banned vocabulary); and which of the four subscore keys
> means what for this audience. Quote the docs. If there are no source docs,
> derive all of it from the landing page copy and say so.
>
> **Phase 2 — Audit the landing page (§2). Report gaps; do not fix its repo
> without asking.** Cover all four:
> a. Hand-off parity — diff its `lib/scorecard.ts` against adhd / B2B /
>    retargeting. Every utm, every click id, `fbp`/`fbc`, a stable `ref`, and
>    `lp`. **Write down the `lp=` slug.**
> b. Live pages — every route, a deliberate 404, six breakpoints for
>    horizontal overflow, every CTA's href carrying the full param set, and a
>    banned-claims sweep against this vertical's own spec.
> c. **Analytics env (§2.3) — check the deployed site actually fires the Meta
>    Pixel and PostHog.** The coaches page shipped with neither because its env
>    vars were never set in Vercel, and nothing errored. Compare against a
>    sibling; the pixel id must match the other properties.
> d. Attribution correctness (§2.4) — run the first-touch cases against the
>    deployed funnel. A bare visit followed by an ad click must capture the ad.
>
> **Phase 3 — Register the vertical (§3).** Add the id to `VERTICALS`, then let
> `npx tsc --noEmit` drive you through every `Record<Vertical, …>` map it
> breaks. The alias for the `lp=` slug from Phase 2a is the single most
> important line in the change: without it, every paid click silently runs the
> main funnel with main's copy.
>
> **Phase 4 — Author the content pack (§4)** and seed it (§5). Author it with a
> generator script, not by hand. **Seed with `--db=scorecard`** — `.env.local`
> points at a database nothing serves, and seeding the wrong one prints
> "Done. Wrote 39 keys." Confirm 39 keys landed, matching every other vertical.
>
> **Phase 5 — Verify locally (§6):** typecheck, build, entry page serving the
> vertical's copy server-side, the question/beat API returning this vertical's
> content, main unchanged, and attribution landing under
> `ufa_attribution:<id>`.
>
> **Phase 6 — Verify live (§7).** Drive a real browser from the landing page
> through an ad click, the hand-off, signup, all five questions, all five
> beats, processing, summary/score, and the offer page. Then audit the AI
> output against the Phase 1 register rules, and confirm every field persisted
> on the row. Finish by creating one **signup-only** lead (no questions, no AI
> spend) so I have a clean row to open in admin, and give me its email.
>
> **Report format:** for each phase, what you verified and how you know —
> commands run and their output, not assurances. State explicitly what you did
> NOT verify. If something is blocked, finish everything else and say what you
> left out.

---

**Optional slots** — add any of these only if you already know the answer;
otherwise the agent decides and reports:

```
Vertical id:            <short lowercase, e.g. traders>
Public product name:    <verbatim the LP's primary CTA>
Paid artifact name:     <short - it goes in the PDF header and every footer>
Offer variant:          b2c ($47 page) | b2b (structurally different page)
Deployed LP domain:     <e.g. traders.aimerge.live>
```

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

### 2.3 Analytics env — the check that was missed on coaches

The coaches landing page shipped to production with **no Meta Pixel and no
PostHog**. The components were present and correct; the environment variables
were simply never set, in the repo or in Vercel. Nothing errored, nothing
logged, and the page looked perfect. It was found only because someone asked.

Do all three:

```bash
# 1. What does the code actually read?
cd <lp-repo>
grep -rhoE "process\.env\.[A-Z_0-9]+" app components lib *.ts | sort -u

# 2. Do env files even exist? (coaches had NONE, not even .env.example,
#    despite its own README telling you to copy one)
ls -a | grep -iE "^\.env"
```

3. **Check the deployed site, not the repo.** Load it in a browser, accept the
   cookie banner (both sinks are consent-gated), wait, then assert:

   - `fbq('init', '<id>')` appears in the HTML, `typeof window.fbq === "function"`,
     and a request went to `connect.facebook.net`;
   - requests are reaching `/ingest/...` and a `ph_<token>_posthog` key with a
     `distinct_id` exists in localStorage.

   Always run a **known-good sibling as a control** in the same script.
   Both PostHog and the pixel are easy to mis-measure — the capture endpoint
   moves between posthog-js versions, so "no capture requests" on the new page
   means nothing unless the control shows them too.

The pixel id **must match the other properties**. As of 2026-08-07,
adhd.aimerge.live, healthcareops.aimerge.live and the funnel at
www.aimerge.live all initialise the same id. A different id on a new landing
page splits the ad click and the Lead that follows it into two datasets.

If env files are missing, create `.env.example` (documented) and `.env.local`
(real values), matching the sibling convention — both are gitignored via
`.env*` and are not tracked. Then say plainly:

> **`.env.local` does not affect production.** `NEXT_PUBLIC_*` values are
> inlined at build time from the Vercel project's Environment Variables. They
> must be set there and the project **redeployed** — saving them is not enough.

What is lost while this is broken, so you can describe the damage accurately:
all landing-page pixel events (so Meta has no on-page engagement signal to
optimise on, and no retargeting pool) and all PostHog funnel events
(`landing_page_view`, `scroll_depth_*`, `vsl_*`, `cta_click`). What is **not**
lost: the ad-to-lead chain, because `fbclid` is captured from the URL by the
landing page's attribution module regardless of the pixel, forwarded on the
CTA, and turned into `_fbc` by the funnel's own pixel.

### 2.4 Attribution correctness

Adding a vertical is a good moment to re-run these, because the failure mode is
invisible in the UI and only shows up as unattributed ad spend weeks later.
See `lib/client/attribution.ts` and the `CAMPAIGN_KEYS` comment for the bug
this guards against — a field that is set on *every* capture must never be
counted as campaign evidence, or the first bare visit locks the record forever.

Drive a browser against the deployed funnel with a fresh context per case:

| # | Steps | Expected |
|---|---|---|
| 1 | `/` only | nothing stored |
| 2 | `/` then `/?utm_source=…&fbclid=…` | **ad data captured** |
| 3 | ad URL on a clean browser | captured (control) |
| 4 | ad A then ad B | A survives, B ignored |
| 5 | `/` three times | still nothing stored |
| 6 | `/challenge/audience?lp=<slug>&utm…` | stored under `ufa_attribution:<id>` |
| 7 | `/` then the vertical hand-off | separate key, vertical captured |

Case 2 is the one that regressed in production. Cases 6 and 7 confirm the new
vertical did not contaminate, or get contaminated by, another one.

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

### 7.1 Leave a clean row behind

The full run above produces a row cluttered with test answers. Finish with one
more pass that stops at signup — bare visit, then an ad click, then name and
email, then stop. No questions answered means no AI spend, and it gives whoever
asked for this a single unambiguous row to open in admin with the whole campaign
set on it. Hand them the email address.

### 7.2 Decisions worth raising, not asking

These came up on coaches and are better reported than blocked on:

- **CTA length.** `Get Your Free {productName}` is rendered on buttons. Once
  the product name passes ~35 characters it reads badly in uppercase with
  letter-spacing. Check whether the vertical's spec sanctions a short CTA form
  (coaches' did: a full primary CTA and a short sticky CTA). The entry button
  is `ctaLabel` in Cosmos and is admin-editable without a deploy; the
  exit-intent button is hardcoded and shared by every vertical.
- **Score calibration.** Run the numbers on the first real respondents. A
  vertical whose audience writes well for a living can score high on a rubric
  meant to be conservative, which weakens the reason to buy.
- **Upsell ladder.** Every non-healthcare vertical inherits the consumer
  ladder from `lib/offers.ts`. Check the register fits; do not invent new
  price points or Stripe links.

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
| The funnel's own cookie banner | Fixed to the bottom; it overlaps the entry-page CTA at desktop heights and intercepts the click until dismissed |

---

## 8.1 · The silent failure modes, in one list

Every one of these printed success and produced a broken funnel. If you verify
nothing else, verify these:

1. **Missing `lp=` alias** → `normalizeVertical()` returns null, paid traffic
   runs the main funnel with main's copy. Nothing errors.
2. **Seeding the wrong Cosmos database** → `.env.local` says `test`, the live
   site reads `scorecard`. Prints `Done. Wrote 39 keys.` either way.
3. **A `prompt` field the seeder ignores** → only `beats[].userPrompt` maps to
   `beatN_prompt`. Healthcare's config still carries a dead `prompt` key.
4. **Analytics env never set** → pixel and PostHog silently absent in
   production; the page looks perfect (§2.3).
5. **A self-stamped field inside the campaign-signal test** → the first bare
   visit permanently locks out every later ad click (§2.4).
6. **A report prompt that overruns `maxTokens: 5200`** → JSON truncates
   mid-string, parsing fails, and the buyer receives nothing.
7. **`grep $'—'` in Git Bash** → returns zero matches on a file full of em
   dashes. Use the Node one-liner in §4.2.

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
