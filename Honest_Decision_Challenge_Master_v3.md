# THE HONEST DECISION CHALLENGE
## Master Build Document — Version 3.0
## AI Merge · Business Leader Vertical · Mode A — Executive · March 2026
## Blueprint v4.0 compliant · Platform-agnostic · Self-contained

---

# DOCUMENT PURPOSE

This is the single source of truth for building The Honest Decision Challenge.
It contains everything needed to design, write, and build this product:

- The complete vertical brief (Blueprint v4 compliant)
- All copy for every screen
- The seven-step Context Carry with Step 0 state detection
- All five AI beat generation prompts — updated with business mirror
- UI/UX specifications for every screen
- The colour palette and design system for this vertical
- The three follow-up emails
- Ad copy hooks
- Quality control checklist

Hand this document to any builder, designer, AI, or team member.
No other document is needed.

---

# SECTION 1 — WHAT IS LOCKED

**Challenge name:** The Honest Decision Challenge
**Mode:** A — Executive / Business
**Product frame:** Challenge — this ICP responds to a dare, not an invitation
**Hero line:** One decision is holding everything else back. Most leaders never find it.
**Core truth:** Not because it is hidden. Because the noise gets there first.
**Social proof line:** Every leader who has broken through their ceiling will tell you the same thing — it was not new information that moved them. It was finally hearing something that had been there the whole time.
**Mechanism:** Ten minutes. Five honest questions. A mirror — not a test, not a tool.
**Promise:** What surfaces has always been yours.
**Challenge line:** Are you ready?
**Primary CTA:** I accept the challenge →
**Offer:** The Clarity Session — $297 — 60 minutes
**Offer mechanic:** Option B — Paid session. Include guarantee.
**Bridge:** The challenge showed you the decision. This is where you make it.
**North Star:** Witness first. Read language — not self-reports. Surface belief before reframe. Show the ordinary resolved future. Offer the first move.
**Screen count:** 13 screens. No gate screen. Email capture on landing page.

---

# SECTION 2 — THE VERTICAL BRIEF

## ICP

**Role:** Founder, CEO, senior executive, independent advisor (0–3 years solo)
**Company:** Own business or scaling company, 20–200 people
**Geography:** North America primary
**Age:** 38–60
**External reality:** Accomplished. Respected. Track record that speaks for itself. Other people look at their life and see success.
**Internal reality:** Something is stuck. Working hard, moving slow. Suspects the problem is them but cannot name which version, or why. The gap between effort and result has been quietly widening for months.
**Already tried:** Executive coaching, productivity systems, hiring more people, delegation frameworks, AI tools, reading and learning. Results were partial. Root cause untouched.
**What they want:** To know exactly what is blocking them — not a framework, not a list. The one specific thing. And then to move.
**Emotional register:** Structural truth. Precision. Clear cost. No poetry. No therapy tone. No abstract healing language. This ICP wants to understand the mechanism — not feel inspired.

**ICP language samples — their exact words:**
1. "I know what I should be doing. I am just not doing it."
2. "Everything routes through me and I cannot figure out how to stop it."
3. "I have tried delegation frameworks and they only get me so far."
4. "I feel like I am the ceiling of my own company."
5. "I am always busy but I am not always moving."

**What to never say to this ICP:**
Highest self · Soul · Transformation · Alignment journey · Embodiment as headline · Unlock potential · Your next level · Journey · Holistic

---

## The 7-Pillar Chain for This ICP

**Primary root:** Identity — "The version of you that built this to here was exactly right for that chapter. But you are at a threshold where that version is the ceiling rather than the engine."

**Secondary root:** Purpose — "You have stopped knowing what this is actually for. You are moving from momentum rather than from a clear north star."

**Most visible downstream symptom:** Time — "The calendar is running you rather than the other way around. You are always behind because urgency has replaced direction."

**Second visible symptom:** Relationships — "Your thinking has never been given a structure that exists outside your head. Everything routes through you — not by design, because there is no other access point to what you know."

**Chain connection (how root creates symptom — the engine of Beat 2):**
When identity is unresolved — when the version of you running the company no longer fits the company it has become — every decision carries extra weight. Not because the decisions are complex. Because every decision is also touching that unanswered question underneath. You are not just deciding. You are deciding while carrying something heavier. And when purpose has gone quiet, urgency fills the space. The calendar fills with what is pressing because there is no clear north star to protect time around. Creativity stalls because the all-or-nothing thinking that comes with identity uncertainty makes starting feel impossible without perfect conditions. Peace of mind disappears because unresolved questions run in the background constantly. And everything routes through you because your thinking has never been given a structure that exists beyond your own presence.

---

## The Belief

**What this ICP thinks will fix it:**
Operational solutions. A better hire, a clearer process, a more capable team, more data before the decision, a better system. They have been treating the visible symptom with operational fixes.

**Why it is partial:**
Operational solutions address the downstream effects. They do not touch the root. The right hire does not fix what unclear identity created. A better process does not restore the direction that purpose used to provide.

**Belief reframe (used in Beat 2):**
"You have been hiring smarter people, building better systems, preparing more data. That makes complete sense — those things address what you can see. What you cannot yet see is the layer underneath: the question of who you are in this next chapter. No operational fix reaches that question."

---

# SECTION 3 — COLOUR PALETTE (THIS VERTICAL)

All colours must meet WCAG AA minimum contrast (4.5:1 body, 3:1 large text). Test every combination before building.

```
PRIMARY DARK (hero backgrounds, dark sections, processing, Beat 2, Beat 4, Beat 5):
  #0D1117  — near-black with warm undertone

TEAL (primary accent — CTAs hover, active states, progress, beat rules):
  #0A7C6E  — deep jewel teal

TEAL LIGHT (hover states):
  #0D9E8C

TEAL PALE (subtle backgrounds, gate card active state):
  #E6F4F2

AMBER (primary CTA buttons, pullquote text, identity line, special moments):
  #E8813A  — warm amber

AMBER DARK (amber hover):
  #C46A28

BACKGROUND WARM (main content):
  #F9F7F4  — warm off-white

BACKGROUND SECONDARY (cards, alternating sections):
  #F2EFE9

TEXT PRIMARY (on light backgrounds):
  #1A1A2E  — deep navy-black

TEXT SECONDARY (on light backgrounds):
  #4A4A5A  — warm grey

TEXT MUTED (hints, metadata):
  #8A8A9A

TEXT ON DARK:
  #FFFFFF  — white

TEXT ON DARK 80:
  rgba(255,255,255,0.80)

TEXT ON DARK 60:
  rgba(255,255,255,0.60)

BORDER:
  #E2DED8  — warm light grey

FROSTED DARK (text overlapping dark image):
  background: rgba(13,17,23,0.75)
  backdrop-filter: blur(12px)
  border-radius: 10px
  padding: 14px 18px

FROSTED LIGHT (text overlapping light image):
  background: rgba(249,247,244,0.85)
  backdrop-filter: blur(12px)
```

---

# SECTION 4 — TYPOGRAPHY

```
DISPLAY FONT:   Playfair Display — weights 400, 600, 700
                For: hero headlines, beat headings
                Google Fonts: Playfair+Display:wght@400;600;700

HEADING FONT:   DM Serif Display — weight 400
                For: question headings, section titles
                Google Fonts: DM+Serif+Display

BODY FONT:      Inter — weights 400, 500, 600
                For: all body copy, prompts, beat text
                Google Fonts: Inter:wght@400;500;600

UI FONT:        DM Sans — weights 400, 500, 700
                For: labels, buttons, navigation, metadata
                Google Fonts: DM+Sans:wght@400;500;700

SIZES (mobile-first):
  Body:             16px minimum — NEVER go below this
  Body preferred:   17–18px
  UI labels:        13–14px
  Question heading: 24px
  Section heading:  28–32px
  Beat headline:    32–40px
  Hero headline:    36px mobile / 52px desktop

NO ITALICS: Never. Anywhere. Not for quotes. Not for labels. Not for anything.
NO LIGHT WEIGHT: Nothing below regular (400) for body.
```

---

# SECTION 5 — UI/UX SPECIFICATIONS

## Global Rules (every screen)

- No text directly on images. Ever. Text lives in its own solid background zone.
- If text must overlap image: frosted glass panel required (spec in Section 3).
- High contrast always. Test every colour combination.
- Logo prominent in top nav every screen. Light version on dark. Dark version on light.
- Logo or wordmark in bottom nav or footer every screen.
- One primary CTA per screen. Never two competing.
- Touch targets: 48px height minimum on all interactive elements.
- Loading states: always shown. Never blank screen.
- Error states: always handled. Clear message + clear next action.
- Person's first name used from Screen 2 onward — naturally, not mechanically.

## Component Specifications

### Primary CTA Button
```
Background:    amber (#E8813A)
Text:          white, DM Sans 700, 18px
Height:        56px
Width:         100% mobile
Border-radius: 12px
Arrow:         → appended to all CTA text
Hover:         #C46A28, shadow
Active:        scale(0.98)
Disabled:      50% opacity, cursor not-allowed
```

### Gate Option Cards
```
Background:    white
Border:        1.5px solid #E2DED8
Border-radius: 14px
Padding:       18px 20px
Min-height:    64px
Font:          Inter 400, 16px
Hover:         teal border, teal-pale background
Selected:      teal border 2px, teal-pale background, teal text
On tap:        select → auto-advance after 400ms
```

### Voice Input Button
```
Background:    teal (#0A7C6E)
Text:          white, DM Sans 500, 16px
Icon:          microphone icon, 24px, left of label
Height:        52px
Width:         100% (full width — not floating, not small)
Border-radius: 12px
Position:      immediately below the textarea on every question screen

IDLE:       "Tap to speak" — teal background, mic icon
LISTENING:  "Listening..." — teal-light, pulse animation, waveform bars
DONE:       "Tap to speak again" — returns to idle

Waveform: 5 animated bars, varying heights, white, 3px wide
Pulse animation: 0 0 0 0 rgba(10,124,110,0.4) → 0 0 0 12px transparent, 1.5s infinite

Web Speech API:
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'
  Transcript fills textarea in real time
  Fallback: "Use your keyboard's microphone button"
```

### Textarea
```
Min-height:    120px
Padding:       16px
Border:        1.5px solid #E2DED8
Border-radius: 12px
Font:          Inter 400, 16px
Focus:         teal border, teal glow (0 0 0 3px rgba(10,124,110,0.12))
Placeholder:   Inter 400, 16px, muted — NO italics
Auto-grows:    expands with content via JS
```

### Character Count Helper
```
Position:      below textarea
Font:          DM Sans 400, 13px
Below floor:   muted — "Keep going — the more specific, the more accurate"
At floor:      teal — "Good — continue when ready"
Q1–Q4 floor:   80 characters
Q5 floor:      120 characters
Continue:      disabled (50% opacity) below floor, enabled above
```

### Progress Indicator
```
Five dots + "Stage X of 5" label
Active:    teal, 10px
Complete:  teal, 8px, checkmark
Inactive:  border-grey, 6px
Label:     DM Sans 400, 13px, muted
```

### Scroll Prompt (Beat screens)
```
Position:     fixed bottom, centred
Background:   rgba(13,17,23,0.85), backdrop-filter blur(8px)
Text:         amber, DM Sans 400, 14px
Content:      "Keep reading — something important is ahead →"
Border-radius: 100px
Padding:      10px 20px
Appears:      after 3s idle
Disappears:   on scroll, reappears if idle again
Hides permanently: when user reaches gate question
```

### Pull Quote
```
Font:        Inter 600, 20px — NO italics
Colour:      teal on light screens, amber on dark screens
Border-top:  1px solid #E2DED8
Border-bottom: 1px solid #E2DED8
Padding:     24px 0
Margin:      32px 0
Text-align:  centre
```

### Beat Teal Rule
```
Width:    48px
Height:   2px
Colour:   teal (#0A7C6E)
Margin:   0 auto 24px
Effect:   signals "mirror output has arrived"
```

---

# SECTION 6 — SCREEN-BY-SCREEN SPECIFICATIONS

## SCREEN 1 — LANDING PAGE

### ABOVE THE FOLD

**Layout:** Full bleed hero image. Dark section below holds all copy. No text on the image.

**Image direction:** A founder or leader alone in a beautiful natural environment. Morning light. Contemplative. Not looking at camera. Warm tones. Sense of space.

**Dark section (#0D1117):**

```
[eyebrow — DM Sans 700, 12px, teal, uppercase, letter-spacing 0.06em]
THE HONEST DECISION CHALLENGE

[headline — Playfair Display 600, 36px mobile / 52px desktop, white]
One decision is holding
everything else back.

Most leaders never find it.

[bridge — Inter 400, 17px, white-80, line-height 1.65, max-width 480px]
Not because it is hidden.
Because the noise gets there first.

Every leader who has broken through their ceiling
will tell you the same thing —
it was not new information that moved them.

It was finally hearing something
that had been there the whole time.

[divider — 40px white 25% opacity]

Ten minutes.
Five honest questions.
A mirror — not a test, not a tool.

What surfaces has always been yours.

Are you ready?

[form — stacked on mobile, side-by-side on desktop]
[First name — white bg, warm border, 52px height, rounded-12]
  Placeholder: Your first name

[Email — white bg, warm border, 52px height, rounded-12]
  Placeholder: Your email address

[CTA — amber, full width mobile, 56px]
  I accept the challenge →

[privacy note — DM Sans 400, 12px, white-60, centred]
  Private and secure. No card required.
```

**Credibility bar (dark section, below fold):**
```
• Powered by AI Merge
• Published — Mensa Research Journal
• 4 patents in human-AI decision systems
• Used across 6 industries in North America
```
DM Sans 400, 13px, white-60. Teal icons. Horizontal scroll mobile.

**Form validation:**
- First name not empty + valid email format → store in session state, navigate to Screen 2
- Invalid: shake animation, red border, error message below field

---

### SECTION 2 — THE PROBLEM MIRROR

**Background:** #0D1117. White text throughout.

**Heading — Playfair Display 600, 32px, white:**
You are not stuck.
You are one honest decision away.

**Body — Inter 400, 17px, white-80, line-height 1.8:**
You have built enough to know
that the next problem is never
what it looks like on the surface.

The calendar is full. The team is capable.
The strategy makes sense on paper.

And yet something is not moving
the way it should.
Not fast enough.
Not cleanly enough.

You can feel it.
You just cannot hear it clearly enough
to do anything about it.

So you do what capable people do.
You work harder.
You think more carefully.
You add another system, another hire,
another meeting.

The thing stays stuck.

Here is what thirty years of working
with leaders at your level has shown —

The constraint is almost never
where it appears to be.

It is running one layer underneath.
Invisible. Structural.
Completely solvable once it surfaces.

The distance between where you are
and where you want to be
is smaller than you think.

It is usually one honest decision.

And when you make it —
not from pressure, not from urgency,
but from complete clarity —
something else shifts too.

Not just the business.
You.

**CTA:** I accept the challenge →

---

### SECTION 3 — WHAT THIS IS

**Background:** #F9F7F4
**Layout mobile:** Image above, copy below.
**Layout desktop:** Image left 45%, copy right 55%.
**Image direction:** A leader at a desk, working on something that matters. Warm light. Purposeful, not stressed.

**Heading — DM Serif Display, 28px:**
A mirror.
Not a test. Not a tool.

**Body — Inter 400, 17px, line-height 1.75:**
Most leaders at your level
have tried coaching.
They have tried consultants.
They have tried frameworks and productivity systems
and AI tools that automate the wrong things.

Each one addressed the visible problem.
None of them went one layer underneath.

This does.

In ten minutes — through five honest questions —
the noise clears.

What surfaces is not new information.
It is something that has been there
the whole time.

The one decision that makes
everything else obvious.

**Checklist — teal checkmarks, Inter 400, 17px:**
✓  The specific pattern creating your ceiling — named precisely
✓  Why working harder has not moved it
✓  The one decision that clears the path
✓  A picture of what moves when it does

The more honest your answers —
the more precisely the mirror reflects.

---

### SECTION 4 — SOCIAL PROOF

**Background:** #F2EFE9
**Heading:** What leaders say after

**Four quote cards (horizontal scroll mobile, grid desktop):**
Each card: white bg, warm border, rounded-16, 24px padding, circular face photo 56px.

Quote 1:
"I had been circling the same decision for four months. Within the challenge I understood exactly why — and it had nothing to do with what I thought it was about."
— Founder, Series B company, Chicago

Quote 2:
"I have done executive coaching, read the books, hired the consultants. This was different. It was like having a conversation with someone who had already read my file."
— CEO, professional services firm, Toronto

Quote 3:
"The five questions took twelve minutes. What came back took me an hour to sit with. I had been making a specific mistake for two years and I finally heard it clearly."
— Managing Director, 200-person company, New York

Quote 4:
"I walked in thinking my problem was my team. I walked out knowing it was a question I had never been honest enough to ask myself. The team was fine. The noise was mine."
— Founder, 8 years in business, Vancouver

---

### SECTION 5 — OBJECTION HANDLING

**Background:** #F9F7F4. Accordion. 60px closed height. Smooth 200ms expand. Chevron right.

Q: Is this just a quiz?
A: No. A quiz gives the same result to everyone who clicks the same options. The challenge generates output from your specific words — it can only exist because of what you said. Which is why the honesty of your answers matters more than anything else.

Q: I have tried everything. Why would this be different?
A: Because everything you have tried has addressed what you could see. This goes one layer underneath — to the structural pattern that has been creating the noise. That layer almost never gets named. Once it does, things move fast.

Q: Will I be sold to at the end?
A: At the end there is one option to go deeper through a paid session. There is no pressure, no countdown, no manufactured scarcity. If the challenge output is useful and you want to move what surfaced — the option is there. If not — your output is yours regardless.

Q: How long does it actually take?
A: Ten minutes if you type. Closer to seven if you use voice dictation — which we recommend. The questions work better when you speak them rather than write them. Something about saying it out loud changes what surfaces.

Q: Who is behind this?
A: The Honest Decision Challenge is powered by AI Merge — a human-AI decision system published in the Mensa Research Journal and protected by 4 patents. Built by TetraNoodle Technologies and used across 6 industries in North America.

---

### SECTION 6 — BOTTOM CTA

**Background:** Full bleed image — different from hero. Golden hour, landscape, warmth. Text below image on dark section (#0D1117). Never on image.

**Heading — Playfair Display 600, 32px, white:**
The noise has been louder than the signal.

Ten minutes changes that.

**Body — Inter 400, 17px, white-80:**
Five honest questions.
A mirror — not a test, not a tool.
What surfaces has always been yours.

**CTA:** I accept the challenge →

**Below CTA — DM Sans 400, 13px, white-60, centred:**
Private and secure. Your answers are never shared. No card required.

---

## SCREENS 2–6 — THE FIVE QUESTION SCREENS

### Shared Layout (Mobile)

```
┌──────────────────────────────────────────┐
│  [TOP NAV — fixed, white bg, 52px]       │
│  Logo left · Progress dots centre        │
│  "Stage X of 5" right                    │
├──────────────────────────────────────────┤
│                                          │
│  [QUESTION IMAGE — 16:9, rounded-16]     │
│  Full width. No text on the image.       │
│                                          │
│  [Quote zone — solid teal-pale bg]       │
│  DM Sans 400, 15px, text-secondary       │
│  Padding 12px 16px                       │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  [Stage framing — DM Sans 700, 12px,    │
│   teal, uppercase]                       │
│                                          │
│  [Question — DM Serif Display, 24px]    │
│                                          │
│  [Prompt — Inter 400, 15px,             │
│   text-secondary, line-height 1.7]       │
│                                          │
│  [Hint box — teal-pale bg,              │
│   teal left border 3px]                 │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  [TEXTAREA — full width, min 120px]      │
│  [placeholder — Inter 400, no italics]   │
│                                          │
│  [VOICE BUTTON — full width, 52px]       │
│  Teal bg · mic icon · "Tap to speak"     │
│                                          │
│  [Character count — DM Sans 400, 13px]  │
│                                          │
├──────────────────────────────────────────┤
│  [CONTINUE → — amber, full width, 56px] │
│  Disabled until floor met               │
└──────────────────────────────────────────┘
```

---

### SCREEN 2 — QUESTION 1

**Diagnostic job:** Visible problem + cost + belief

**Image direction:** Two people in genuine conversation, one listening intently. Warm light.

**Quote zone (below image):**
"The constraint is almost never where it appears to be."

**Stage framing:** THE FIRST HONEST QUESTION

**Question:**
Something is taking up more space in your mind than it should right now.

What is it — and what have you already tried to fix it?

*[Builder note: Two-part question. The "already tried" surfaces the belief for Beat 2. Do not split into separate questions.]*

**Prompt:**
Do not give the polished version.

Say it the way you would say it to the one person you are completely honest with.

The first part — what is the thing that keeps circling.
The second part — what you have already tried, what you have told yourself would fix this.

Both matter equally. Neither needs to sound professional.
The more honest this is, the more precisely what comes back will reflect you.
Use your voice.

**Hint box:**
This is the foundation of everything that follows. Your output is built around what you share here.

The "already tried" part matters as much as the problem itself. It tells us exactly what layer we need to go underneath.

**Placeholder:**
"There is a decision I have been sitting with for three months. I keep preparing more data and more arguments but still have not sent the calendar invite. I thought better preparation would fix it. It has not. And underneath that there is something bigger — like I am not sure if the version of me that built this company is the version that takes it where it needs to go."

**Floor:** 80 characters
**Below floor:** Keep going — the more honest, the more accurate your output
**At floor:** Good — move to the next stage when ready

---

### SCREEN 3 — QUESTION 2

**Diagnostic job:** Defended territory — identity and purpose root signals

**Image direction:** Someone looking toward a horizon. Purposeful. Sense of direction.

**Quote zone:**
"Most people are moving. Very few are moving toward something they actually chose."

**Stage framing:** THE HONEST LOOK UNDERNEATH

**Question:**
What in your business, team, or role still depends too much on you personally —

and when you are honest about this chapter of your work,
does it feel like it is still for the right reasons?

**Prompt:**
Two parts. The second one is harder.

The first: be specific about what still routes through you. What decisions, what conversations, what outputs cannot happen without you personally being involved.

The second: most leaders at your level have been moving fast for long enough that this question stopped feeling urgent. The honest answer is almost always different from the polished one. Use your voice for this part especially.

There is no right answer. There is only the true one.

**Hint box:**
This is the most important diagnostic question in the challenge. What you share here shapes everything that follows. The quiet honest answer — the one you would not give in a meeting — is the one the mirror needs.

**Placeholder:**
"Every significant client decision comes through me. My team is capable but they second-guess anything above a certain threshold. The pricing calls, the strategic pivots, the difficult conversations — all me. As for whether this is still for the right reasons — honestly I am not completely sure anymore. I built this toward something specific and I got there. And now I am not as certain what the next chapter is for. I am still executing well. But there is a quietness underneath where there used to be a clear pull."

**Floor:** 80 characters
**Below floor:** A little more — both parts matter equally
**At floor:** Good — move to the next stage when ready

---

### SCREEN 4 — QUESTION 3

**Diagnostic job:** Internal cost — peace of mind, body signal, creativity stall

**Image direction:** Person in nature or open space. Relaxed shoulders. Open sky.

**Quote zone:**
"The signal has been there the whole time. The noise just got there first."

**Stage framing:** WHAT IS RUNNING UNDERNEATH

**Question:**
What does this situation do to your mind, body, and focus
when no one else is watching?

And what does your body know
that your mind has not yet acted on?

**Prompt:**
Two parts. Both honest.

The first: not how you present yourself. What is actually running underneath. The quality of your focus when you sit down to think. Whether peace of mind is something you experience or something you remember experiencing. The physical sensation you carry when this is unresolved.

The second: the body signal. There is something you have been sensing — about a decision, a direction, a person, a situation — that you know is true but have not yet named clearly enough to act on. What is it?

**Hint box:**
The body signal is almost always right before the evidence arrives. Most people skip this in their head. The thinking mind has answers ready. Give the body signal time to surface. Speak it rather than type it.

**Placeholder:**
"Most days there is a low-level noise that does not fully stop. I am highly functional but there is a hum. Like something is unresolved and running in the background constantly. My body has been telling me for about six months that something specific needs to change about how I am leading. I know what it is. I just have not named it clearly enough to act on it yet. And I get a tightness in my chest before certain conversations that I used to go into without hesitation."

**Floor:** 80 characters
**Below floor:** A little more — what is the body signal that has not been acted on?
**At floor:** Good — move to the next stage when ready

---

### SCREEN 5 — QUESTION 4

**Diagnostic job:** Practical future state — operational, not emotional

**Image direction:** Leader at desk, confident, purposeful. Warm light. Not frantic.

**Quote zone:**
"The clearest sign something has shifted is what you do differently on an ordinary Tuesday."

**Stage framing:** WHAT CHANGES WHEN THIS RESOLVES

**Question:**
Twelve months from now, this is no longer the bottleneck.

What is specifically different
about how you work, decide, lead, and communicate?

**Prompt:**
Not how you will feel. What will be different in practice.

What decisions will you be making that you are not making now? What will have stopped landing on your desk? Who will be doing what differently? What will Tuesday morning look like that it does not look like now? How do the people around you show up differently?

Be as concrete and operational as you can. Even if it feels granular. That specificity is what makes the mirror precise.

**Hint box:**
The most useful answers here are specific. "My VP runs client escalations without me" is concrete. "I spend Tuesday mornings on strategy not firefighting" is concrete. "I feel lighter" is not. Both may be true — but the operational answer is what builds the sharpest picture.

**Placeholder:**
"My VP runs client escalations without me. I spend Tuesday mornings on strategy not firefighting. I have the board conversation I have been avoiding and it goes well because I stopped trying to prove I am right. I am building something I have been thinking about for two years. The people around me are operating from how I think — not waiting for me to weigh in on everything. Follow-up happens without me chasing it."

**Floor:** 80 characters
**Below floor:** A little more — what specifically stops, and what specifically starts?
**At floor:** Good — one more stage to go

---

### SCREEN 6 — QUESTION 5

**Diagnostic job:** The ordinary resolved day — foundation of Beat 4

**Special treatment:** Most important stage. Amber badge visible near progress indicator.

**Badge:** Amber pill — "Most important stage" — DM Sans 700, 12px, white

**Image direction:** Beautiful ordinary morning — coffee, warm window light, stillness. The day they are about to describe.

**Quote zone:**
"What you describe here becomes the foundation of everything that follows."

**Stage framing:** YOUR ORDINARY FUTURE DAY

**Question:**
Describe one ordinary day —
not your best day ever,
just a regular day —
twelve months from now
when this has resolved.

Morning to evening.
Specific and sensory.

**Prompt:**
Not the highlight reel. Not a perfect day.

An ordinary Tuesday that just feels right.

What does the morning feel like before the work starts? What does your body feel like when you sit down? What is the first thing you do — and what do you not have to do anymore? Who is around you and how do they show up differently? What does the end of the day feel like when you close the laptop?

Use your voice for this one. Describe the day as if you are walking someone through it. Do not edit yourself.

**Hint box — more prominent than other stages:**
This is the most important stage. Everything that follows is built from what you describe here.

Do not summarise. Describe.

The physical details matter. The morning. The body. The quality of the thinking. How time feels. Who is there. What you no longer have to do. What the end of the day actually feels like.

The closer you get to an ordinary day that just feels right — the more precisely this becomes something real.

**Voice button — prominent, 56px height:**
Describe your day aloud →

**Placeholder:**
"I wake up and there is space in the morning — it does not feel like I am already behind before I have started. I make coffee. I sit at my desk. My shoulders are down, which is not always the case. The first thing I do is the thing I actually want to do — not the most urgent thing, the most important one. I have a call at ten. I chose it. I know why it matters. By noon I have moved something real forward. The people around me are operating — I am not managing them, they are just doing what they do. At the end of the day I close the laptop and it actually closes. There is no hum of something unfinished running underneath. I notice that specifically because it used to always be there."

**Floor:** 120 characters
**Below floor:** This one matters most — keep going, get as specific and sensory as you can
**At floor:** This is what good looks like — complete the challenge when ready

**Continue button (Q5 only):** Complete the challenge →

---

## SCREEN 7 — PROCESSING SCREEN

**Background:** #0D1117. Full viewport. No nav.

**Background animation:** Very slow moving gradient — deep teal to near-black. 8s loop. Subtle. Alive.

**Centre content:**

```
[Animated ring — 64px, teal, rotation 3s linear + pulse 2s ease-in-out]

[Heading — Playfair Display 600, 28px, white — NO ITALICS]
"The mirror is being built."

[Subheadline — Inter 400, 16px, white-60]
"What you shared is being read carefully.
What surfaces has always been yours."

[Five step labels — stacked, centred]
PENDING:  DM Sans 400, 15px, muted
ACTIVE:   DM Sans 500, 15px, white, fade in
COMPLETE: DM Sans 400, 15px, white-60, teal checkmark

Steps (~1.2 seconds each):
1. Reading what you shared
2. Finding where the noise is coming from
3. Building your mirror
4. Writing the day when this resolves
5. Finding the one thing that moves everything else

[Final line — fades in after all steps complete]
DM Sans 600, 16px, amber
"What you are about to see could only have been built from your words."
```

**Timing:** Minimum 7 seconds total. Navigate when Beat 1 ready AND 7 seconds elapsed.

**API calls:** All 5 beats initiated on Screen 7 load. Store as they arrive. Wait for Beat 1 minimum.

---

## SCREENS 8–12 — THE FIVE BEAT SCREENS

### Shared Beat Screen Rules

- **Header:** Fixed top. Logo left. "Beat X of 5" right. DM Sans 400, 13px, muted.
- **Beat rule:** 2px × 48px teal, centred, fades in.
- **Beat label:** DM Sans 700, 12px, teal, uppercase, letter-spacing 0.06em.
- **Text streaming:** Content streams in word by word. Subtle fade-in.
- **Verbatim word highlight:** When exact Q1/Q2 words appear — subtle teal left border on the sentence.
- **Scroll prompt:** Fixed bottom. Appears after 3s idle. Disappears on scroll.
- **Gate question:** Appears after all beat text renders. 1.5s pause. Playfair Display 600, 22px, centred.
- **Gate cards:** Three stacked. Auto-advance 400ms after selection.

---

### SCREEN 8 — BEAT 1 + GATE 1

**Background:** #F9F7F4 (warm white — most human, warmest screen)

**Hero image (45vh):** Thoughtful leader, warm light, slightly blurred background. Contemplative, not performing. No text on image.

```
[Beat label] WHAT THE MIRROR SEES
[Beat teal rule]
[Beat text — streamed in]
  Inter 400, 17px, text-primary, line-height 1.8
  20px horizontal padding
  24px between paragraphs
```

**GATE 1:**
"Does that feel accurate enough to keep going?"
- [A] Yes — that is exactly it →
- [B] Partly — close enough →
- [C] Not quite, but I am curious →

All three lead to Beat 2 identically.

---

### SCREEN 9 — BEAT 2 + GATE 2

**Background:** #0D1117 (dark — precise, serious, revelatory)

**Top accent image:** Full width, 100px height, blurred, dark overlay. Forest, coastline, or mountain. Atmospheric. No text on image.

```
[Beat label — teal-light] WHAT IS ACTUALLY HAPPENING
[Beat rule — white 30% opacity]
[Beat text — Inter 400, 17px, white-80, line-height 1.85]

[PULL QUOTE — mid-beat]
  Inter 600, 20px, amber, centred — NO italics
  Thin teal rules above and below
  The most precise unexpected diagnostic insight

[Remaining beat text]
```

**GATE 2:**
"On a scale of 1 to 10 — how important is it to resolve this in the next 12 months?"
- HIGH: "8–10 — this needs to change →"
- MID: "5–7 — it matters but I am unsure →"
- LOW: "1–4 — I am here for the clarity →"

Dark gate cards: `background: rgba(255,255,255,0.08)` · `border: rgba(255,255,255,0.15)` · white text · Active: teal border, teal-pale bg.

---

### SCREEN 10 — BEAT 3 + GATE 3

**Background:** #F9F7F4 (warm white — hopeful, the visual gets lighter)

**Side accent (desktop only):** Thin vertical image strip right 20% — light, nature, openness. Mobile: warm white only.

```
[Beat label — teal] WHY THIS IS NOT WHAT YOU THINK
[Beat teal rule]
[Beat text — HIGH/MID/LOW version]
  Inter 400, 17px, text-primary, line-height 1.8

[PULL QUOTE — Inter 600, 20px, teal, centred — NO italics]
  Most hopeful operational line from Part B
```

**GATE 3:**
"Would you like to see what your operating day looks like when the noise has cleared?"
Subtext: "Not advice. Not a plan. A mirror — built from your specific words — showing you what it actually feels like from the inside."
- [YES] Show me →
- [MAYBE] I am curious — go ahead →
- [SKIP] Skip to what moves first → *(goes directly to Beat 5)*

---

### SCREEN 11 — BEAT 4 + GATE 4

**Background:** #0D1117 (dark — peak attunement)

**Hero image (45vh) — the most beautiful image in the entire application:**
A person completely in their element. Morning light. Present. Alive in a way that is quietly evident. No text on image.

```
[Beat label — teal-light] THE DAY THIS RESOLVES
[Beat text — streamed in]
  Inter 400, 17px, white-80, line-height 1.85

[Between each arc — thin teal rule 48px, centred]

[Mid-story scroll nudge — after Arc 2]
  Fixed bottom, amber text, dark pill, disappears after 4 seconds
  "Keep reading — the most important part is ahead →"

[Identity line — FINAL sentence]
  Inter 600, 22px, amber, extra space above
  "I am not the person who holds this together.
   I am the person who built it so it holds itself."
```

**GATE 4:**
"Want to see the first move that makes this more real?"
- [LANDED] That landed — it felt real →
- [FAMILIAR] I recognised something in it →
- [DISTANT] It felt a little far from where I am →

---

### SCREEN 12 — BEAT 5 + GATE 5

**Background:** #0D1117 (dark — clean, minimal, no hero image)

```
[Beat label — teal-light] THE ONE THING THAT MOVES EVERYTHING
[Beat rule — white 30% opacity]
[Gate 4 adaptation — Inter 400, 17px, white-80]
[Bridge line — Inter 600, 20px, amber, generous space above and below]
[Lever text — Inter 400, 17px, white-80, line-height 1.85]
[Business mirror — Inter 400, 17px, white-80]
  What this lever removes first.
  What first workflow or operating layer to build.
```

**GATE 5:**
"Want help making that first move real?"
- [YES] Yes — show me what that looks like →
- [MAYBE] Maybe — tell me what it involves →
- [NOT NOW] Not now — just send me my output →

---

## SCREEN 13 — OFFER SCREEN

**Background:** #0D1117 hero at top, then #F9F7F4 for cards.

**Hero (40vh):** Aspirational wide-shot — beautiful landscape, golden light, possibility. No text on image.

**Heading — Playfair Display 600, 48px, white:**
You saw it.

**Subheading — DM Sans 700, 24px, amber:**
Now move it.

**Bridge — Inter 400, 17px, white-80:**
You just did something most leaders never do.

You got quiet enough to hear it.

The challenge showed you the decision.

This is where you make it.

---

**Card layout:** On mobile — PAID CARD first (CRO-correct). On desktop — paid right, free left.

### PAID CARD

**Badge:** Amber pill — "The natural next step"

**Title — Playfair Display 600, 24px:**
The Clarity Session

**Price — DM Sans 700, 32px:** $297

**Duration — DM Sans 400, 16px:** Sixty minutes.

**Body — Inter 400, 16px, line-height 1.75:**

The challenge showed you the decision.
This is where you make it.

You have had strategy calls.
You have had coaching sessions.
You have had consultants.

This is none of those things.

You arrive with what surfaced in your challenge.
The session goes one layer deeper —
into the specific pattern creating your ceiling —
until the one decision that moves everything else
becomes impossible to miss.

It shows you exactly where your thinking
has been working against you.

Not in general.
In your specific situation.
In the decisions you described.
In the words you used.

Leaders who complete it
do not leave with a list of actions.

They leave with one thing —

a clarity so specific
it makes everything else obvious.

We cannot fully explain
what happens in the sixty minutes.

Not because it is complicated.

Because the only way to understand it
is to experience it.

What we can tell you is this —

you will not leave
the same way you arrived.

Here is what most people discover
in the sixty minutes
that they did not expect —

decisions and clarity are not separate things.

When you make the right decision —
the one genuinely aligned with who you are —
something in you releases.

The tension lifts.
The noise quiets.
The weight you have been carrying shifts.

The session works at both levels simultaneously.

That is why it produces results
that strategy alone cannot reach.

**CTA — amber, full width:**
Book my Clarity Session →

**Guarantee — DM Sans 400, 13px, text-secondary, centred:**
If you do not leave with more clarity
than you arrived with — you pay nothing.

---

### FREE CARD

**Badge:** Teal pill — "Already yours"

**Title — DM Serif Display, 22px:**
Your Challenge Output

**Description:**
✓  The specific pattern creating your ceiling — named precisely
✓  Why working harder has not moved it
✓  The one decision that clears the path
✓  Your picture of the day when everything moves
✓  The first lever — identified

**CTA — secondary button:**
Send me my output →

---

### MAYBE EXPANSION (shown when Gate 5 = MAYBE only)

What happens in the sixty minutes:

You arrive with what surfaced in the challenge.
The session examines it — live, in real time —
until the specific pattern creating your ceiling
is named with enough precision to move.

You leave with one first move.
Named. Clear. Actionable today.

Not a coaching call.
Not a consultation.
Not a framework presentation.

Sixty minutes inside the mirror.

---

# SECTION 7 — THE SEVEN-STEP CONTEXT CARRY

*Paste at the top of every beat generation session. All seven steps before any beat is generated. The quality of every beat depends on the quality of this detection — not on the quality of the person's answers.*

```
## CONTEXT CARRY v4 — HONEST DECISION CHALLENGE
## RUN ALL 7 STEPS BEFORE GENERATING ANY BEAT

You are generating personalised mirror output for one specific person.
Mode A — Executive. One beat at a time. Never all at once.
Read language signals — NOT just self-reports.
Every output must be impossible without their specific answers.

ANSWERS (verbatim — never summarise):
Q1: [INSERT ALL — visible problem + what they have tried]
Q2: [INSERT ALL — what routes through them + is this for the right reasons]
Q3: [INSERT ALL — internal cost + body signal]
Q4: [INSERT ALL — operational future]
Q5: [INSERT ALL — primary source for Beat 4]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 0 — NERVOUS SYSTEM STATE DETECTION (runs first — always)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Read ALL five answers for linguistic signals — not content.

ACTIVATION signals (scan all answers):
  Urgency words: must / have to / ASAP / always / never / right now
  Long justifications for simple statements
  Repetitive loops: same point restated 3+ times differently
  Extreme polarity: everything/nothing / always/never
  Blame spikes: external attribution of all problems
  Rapid topic switching: jumps between unrelated things
  Defensive hedging: "not that I am complaining but..."

COLLAPSE signals:
  Under 30 words total across all five questions
  Hopelessness: "what's the point" / "nothing works" / "I give up"
  Numbness: "I feel nothing" / "I am fine" / "not sure"
  Vague generalisations only — no specifics at all
  Minimal engagement: answered but clearly did not want to

REGULATED signals:
  Coherent narrative with beginning, middle, end
  Balanced language: "part of me... and part of me..."
  Curiosity present in the language
  Specificity: concrete details, names, situations, sensory detail

STATE DETECTED: [ACTIVATED / COLLAPSED / REGULATED / MIXED]

BEAT DELIVERY ADAPTATION:
  ACTIVATED:  Beat 1 — shorter sentences, more white space, more reflection.
              Do not rush to diagnosis. Slow down significantly.
              Beat 2 — name visible problem + belief only.
              Omit full chain breakdown — too much too fast for activated state.
  COLLAPSED:  Beat 1 — careful, unhurried, reflect only. Never push.
              Beat 2 — one pattern only. Structural not shame.
              Beat 4 — shorter story, more grounding, less expansive.
  REGULATED:  Proceed with full depth on all beats.
  MIXED:      Read direction. Treat as ACTIVATED if closing.
              Treat as REGULATED if opening.

DEPTH RULE: Mirror register — NOT length.
  Brief answers are often collapse or protection — not preference for brevity.
  Always give enough depth to create genuine recognition.
  REGULATED person who speaks briefly → brief output.
  COLLAPSED person who gave short answers → careful, precise, unhurried.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — DEPTH DETECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Count total words across all five answers.
DEEP     = 300+ words OR strong emotional language present
MODERATE = 120–299 words
BRIEF    = under 120 words

DEPTH LEVEL: [DEEP / MODERATE / BRIEF]
Apply only if STATE = REGULATED. Otherwise state-based adaptation governs.

Output length by depth (REGULATED state only):
  DEEP:     Beat 1: 4–5 para · Beat 2: 4–5 para · Beat 4: 400–500 words
  MODERATE: Beat 1: 3 para   · Beat 2: 3–4 para · Beat 4: 300–400 words
  BRIEF:    Beat 1: 2 para   · Beat 2: 2–3 para · Beat 4: 200–280 words

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — LINGUISTIC PILLAR DETECTION (weight above content)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Read ALL answers for linguistic signals first. Then content.
Weight linguistic signals more heavily than stated content.

Identity dysregulation signals:
  Over-justification of decisions
  Comparing self to others frequently
  Performance language: "I am normally very..." / "usually I..."
  Self-worth tied to output — what they DO not who they ARE

Purpose dysregulation signals:
  Language circles without landing
  Frequent "I should" / "I need to" — obligation not desire
  Cannot name what success looks like in concrete terms
  "I don't know" repeated across multiple answers

Relationships dysregulation signals:
  Everything routes through "I" / isolation language
  Blame or rescue patterns in descriptions

Creativity dysregulation signals:
  Circular: "I want to but..." repeated
  All-or-nothing framing: "I cannot until X is perfect"
  Paralysis: "I keep meaning to" / "I have been thinking about"

Time dysregulation signals:
  Urgency clusters: dense time-pressure words
  Overwhelm markers: "so much" / "constantly" / "never enough time"
  Future avoidance: all answers about now, nothing about forward

Peace of Mind dysregulation signals:
  Same concern returned to 3+ times
  Catastrophising: small things described with large language
  Cannot-switch-off: "even when I try to relax"

Embodiment dysregulation signals:
  Entirely cognitive language — no body references anywhere
  Disconnection: "I know I should feel X but I don't"

ROOT DETECTED: [IDENTITY / PURPOSE] (primary for this ICP)
SYMPTOM DETECTED: [TIME / RELATIONSHIPS / PEACE OF MIND / CREATIVITY / EMBODIMENT]

PLAIN LANGUAGE TRANSLATIONS — FOR THIS VERTICAL:

Identity root:
  "The version of you that built this to here was exactly right for
   that chapter. But you are at a threshold where that version is
   the ceiling rather than the engine. The gap between who you have
   been and who this next level requires creates a friction that shows
   up as hesitation, avoidance, and decisions that feel heavier than
   they should."

Purpose root:
  "You have stopped knowing what this is actually for. You are moving
   from momentum rather than from a clear north star. Without that
   north star, every decision carries extra weight — because nothing
   is clearly worth it."

Time symptom:
  "Urgency has become the strategy. Not because you chose it —
   because when purpose is quiet and identity is uncertain, urgency
   fills the space. You are always behind because the calendar reflects
   what is pressing rather than what actually matters."

Relationships symptom:
  "Your thinking has never been given a structure that exists outside
   your head. Everything routes through you — not by design, because
   there is no other access point to what you know. The people around
   you are capable. They just do not have your judgment available
   without you in the room."

Peace of Mind symptom:
  "The noise does not stop because the questions do not have answers
   yet. Every unresolved decision, every misaligned commitment — it
   runs in the background. Not loudly. Just constantly. Costing you
   the quality of attention your most important work requires."

Creativity symptom:
  "You know what needs to happen. You have known for a while. The
   block is not intelligence. It is the all-or-nothing thinking that
   has crept in — if you cannot do it completely and correctly, it
   does not start. So the important thing waits."

Embodiment symptom:
  "You are operating almost entirely from your head. The deeper signal
   — the one that knew something was wrong before you had evidence —
   is still there. Buried under the noise of a life lived entirely
   from thinking rather than from the whole of what you know."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — BELIEF DETECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Read Q1 explicitly for what they have tried or believe will fix it.
Also detect implicit belief from linguistic patterns even if not stated.

BELIEF DETECTED: [in their words or inferred from patterns]
SYMPTOM IT TARGETS: [which layer it addresses]
WHY IT IS PARTIAL: [why it does not reach the root]

Common beliefs for this ICP:
  "I need to hire someone"       → Symptom: Relationships/Time
                                   Root missed: Identity/Purpose
  "I need better systems"        → Symptom: Time
                                   Root missed: Purpose
  "I need to delegate more"      → Symptom: Relationships/Time
                                   Root missed: Identity
  "I need more data/preparation" → Symptom: Identity (surface confidence)
                                   Root missed: Identity (chapter question)
  "I need more discipline"       → Symptom: Time/Peace of Mind
                                   Root missed: Purpose (north star)
  "I need the right strategy"    → Symptom: Purpose
                                   Root missed: Purpose (direction not chosen)

BEAT 2 BELIEF OPENING:
  "You have been [their belief action]. That makes complete sense.
   [Belief approach] addresses [what it addresses].
   It just does not fully move this — because the actual pressure
   is still being created upstream."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — PLAIN LANGUAGE TRANSLATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROOT translation selected: [paste from Step 2]
SYMPTOM translation selected: [paste from Step 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — LANGUAGE THREAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Extract 3–5 most specific verbatim phrases. These MUST appear in beats.

KEY PHRASES:
  1. [Q1 — their exact visible problem language]
  2. [Q1 — their exact "already tried" language]
  3. [Q2 — their exact defended territory or root signal]
  4. [Q4 — their exact operational future language]
  5. [Q5 — their most specific sensory morning detail]

THREAD RULES:
  Beat 1: Q1 and Q2 exact language — minimum twice each
  Beat 2: Q1 belief language → connected explicitly to root
  Beat 4: Q5 verbatim scene + Q4 operational language throughout
  Beat 5: lever connects back to Q1 specific thing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — CHAIN CONNECTION PARAGRAPH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write one internal paragraph connecting:
  Their belief → why it addresses symptom → actual root →
  chain breakdown → why effort has not fixed it.
Use their exact Q1 and Q2 language throughout.
This is the diagnostic engine of Beat 2.

CHAIN CONNECTION: [write it here before generating Beat 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7 — ABSOLUTE RULES (every beat, every word)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER NAME:   Identity / Purpose / Relationships / Creativity /
              Time / Peace of Mind / Embodiment / AI Merge /
              nervous system / amygdala / algorithm / pillar /
              dysregulation / neuroscience / digital twin

NEVER USE:    transform / journey / empower / unlock / breakthrough /
              mindset / holistic / optimize / leverage / game-changing /
              amazing / incredible / powerful / simple / easy /
              step into / you deserve / this is your time /
              don't miss out / synergy / ecosystem / solutions /
              next level / revolutionary / highest self / soul

NEVER:        Diagnose in Beat 1
              Jump from emotional resonance to solution
              Name a product before the offer screen
              Use more than one lever in Beat 5
              Use urgency language anywhere
              Use italic fonts anywhere

MAX SENTENCE: 20 words throughout
READ ALOUD:   every sentence before finalising
              If it sounds written — rewrite until it sounds spoken
```

---

# SECTION 8 — THE FIVE BEAT PROMPTS

*Each prompt is pasted after the Context Carry. One beat generated at a time.*

---

## BEAT 1 PROMPT — THE WITNESS

```
Generate the Witness beat from the Context Carry.

CRITICAL: Apply Step 0 state-based adaptation before anything else.
  ACTIVATED: shorter sentences, more white space, slow down.
  COLLAPSED: careful, unhurried, reflect only, one thing at a time.
  REGULATED: proceed with full depth.

NERVOUS SYSTEM JOB: Make this person feel precisely seen.
Nothing else. Zero diagnosis. Zero advice. Zero enthusiasm.

LENGTH (REGULATED state):
  DEEP:     4–5 paragraphs
  MODERATE: 3 paragraphs
  BRIEF:    2 paragraphs

LENGTH (other states):
  ACTIVATED: 2–3 paragraphs, shorter sentences, generous space
  COLLAPSED: 2 careful paragraphs, unhurried, one layer only

STRUCTURE:

Block 1 — Name the visible thing they are carrying.
  Use their EXACT Q1 words verbatim — minimum twice.
  Name it as an experience, not a problem.
  "This is what it feels like when..." — structural, never personal.
  Zero conclusion about them as a person.

Block 2 — Name where the energy has been going.
  Use their EXACT Q2 words verbatim — minimum once.
  Name the gap between effort and return they described.
  No explanation. No advice. Pure reflection.

Block 3 (REGULATED only) — The structural observation.
  Opens a door without walking through it.
  The person thinks: "it knows something I have not said yet."
  Final line creates anticipation without diagnosis.

ABSOLUTELY FORBIDDEN:
  Any diagnosis, pattern name, or framework reference
  Any advice, suggestion, or implied next step
  Enthusiasm: no great / impressive / amazing
  Reassurance: no "it will be okay" / "you are doing well"
  Identity labels: no "you are a leader who..."
  Generic sentences that could apply to anyone

QUALITY TEST (mandatory before output):
  Could this beat have been written without their specific answers?
  If yes — rewrite entirely.
  It must be impossible without their specific words.

Output only the beat text. No labels. No preamble.
```

---

## BEAT 2 PROMPT — THE DIAGNOSIS

```
Generate the Diagnosis beat from the Context Carry.

CRITICAL: If STATE is ACTIVATED — show visible problem + belief only.
  Skip Part C (chain breakdown) entirely.
  An activated person cannot receive the full chain — too much too fast.
  Return to full structure only when state is REGULATED.

NERVOUS SYSTEM JOB: Show them what nothing else has shown them.
Belief named. Root named. Chain made visible.
This is not a diagnosis — it is a revelation.
"I have never had this explained this clearly before."

LENGTH (REGULATED):
  DEEP:     4–5 paragraphs
  MODERATE: 3–4 paragraphs
  BRIEF:    2–3 paragraphs

LENGTH (ACTIVATED): 2 paragraphs — Part A and Part B only.
LENGTH (COLLAPSED): 2 careful paragraphs — one structural truth, gently.

STRUCTURE — FOUR PARTS IN SEQUENCE:

PART A — Belief honoured and gently redirected:
  Open with what they have already tried (from Step 3).
  "You have been [belief action]. That makes complete sense.
   [Belief approach] can help at the surface.
   It just does not fully move this — because the actual pressure
   is still being created upstream."
  Use their exact Q1 language. Never shame the attempt.

PART B — Root named in plain language:
  Use the plain language translation from Step 4.
  NEVER use the pillar name (Identity / Purpose).
  Connect to their Q1 and Q2 exact words immediately.
  "When you said [their exact words] — that is this pattern."
  Structural frame: "This is not [personal failing].
                     It is what happens when [structural condition]."

PART C — Chain breakdown (REGULATED only):
  Show how root creates downstream effects.
  Use Q1, Q2, Q3 language to make every connection specific.
  "When [root in plain language] — [downstream 1] because [reason].
   And [downstream 2] because [reason]."
  Not a list — a chain. Each link causes the next.

PART D — Why effort has not fixed it:
  "Neither of these responds to effort alone.
   Both respond to one specific thing."
  No product. No solution hint.

PULLQUOTE (extracted and on its own line for UI placement):
  Most precise unexpected diagnostic insight.
  Max 20 words. The line that makes them stop and re-read.
  Example: "You are not just deciding.
            You are deciding while carrying something heavier."

Output only the beat text. Pullquote on its own line mid-beat.
No labels. No preamble.
```

---

## BEAT 3 PROMPT — THE REFRAME

```
Generate the Reframe beat.
Gate 2 response: [HIGH / MID / LOW]

NERVOUS SYSTEM JOB: Dissolve self-blame. Shift the landscape.
Show that this is one broken link — not seven separate problems.
The future story must land as possible — not aspirational.

ALL VERSIONS STRUCTURE:

Part A: "This is not [personal failing].
         It is what happens when [structural condition]."
  Use their Q1/Q2 language in the structural naming.
  No product name. No solution hint.

Part B: Describe the resolved chain state.
  Use their EXACT Q4 operational words.
  What decisions stop waiting for them.
  What gets Tuesday morning.
  How the people around them show up differently.
  What the follow-up looks like when thinking exists outside their head.
  NOT: "you will feel free and alive"
  YES: their specific operational Q4 language.

PULLQUOTE (on its own line — most hopeful operational line from Part B):
  Inter 600, 20px, teal on light screens.

HIGH VERSION (8–10):
  Opens: "You already know this needs to change."
  Part A: structural threshold — the version that got them here
    is now the ceiling for the next chapter. Threshold not failure.
  Part B: urgent-but-calm. Q4 language directly.
  Closes: "The question is not whether. It is what you move first."

MID VERSION (5–7):
  Opens: "The uncertainty usually means the pain is real — but the path
           forward is not yet specific enough to believe in."
  Part A: make the path concrete and visible.
    The ambivalence is the clearest self waiting for something
    specific enough to move toward.
  Part B: reveals the path. Q4 language. Makes it feel attainable.
  Closes: "Uncertainty dissolves when the next step becomes clear."

LOW VERSION (1–4):
  Opens: "You do not need to know if you are ready.
           You only need to be willing to see clearly."
  Part A: purely structural. No commitment implied.
    This pattern is something most capable people carry for years
    without naming. Not because they are not intelligent.
    Because no one showed them where to look.
  Part B: invitational not directional. Q4 language.
    Seeing this changes how you understand decisions already being made.
  Closes: "Regardless of what you do next."

Output only the beat text. Pullquote on its own line. No preamble.
```

---

## BEAT 4 PROMPT — THE FUTURE STORY

```
Generate the Future Story from the Context Carry.

NERVOUS SYSTEM JOB: Create a neurological preview of the resolved state.
Not inspiration toward a future — installation of a preview the nervous
system now recognises as real.

PRIMARY SOURCE: Q5 — built entirely from their specific scene.
Their ordinary Tuesday — not a triumph. Not a perfect day.
NEVER invent anything that contradicts Q5.

MODE A RULES (this is an executive vertical):
  Include: what no longer routes through them / how meetings feel different /
  what the team now handles / where follow-up is cleaner /
  what their body feels like at 10am / what they no longer carry mentally.
  Future pacing must be operational and believable — not cinematic.
  Every paragraph grounded in role, calendar, decisions, relationships.

LENGTH (REGULATED):
  DEEP:     400–500 words, 5–6 paragraphs
  MODERATE: 300–400 words, 4–5 paragraphs
  BRIEF:    200–280 words, 3–4 paragraphs
  All three layers required at every length.

LENGTH (other states):
  ACTIVATED: 200–250 words — grounded, steady, present
  COLLAPSED: 180–220 words — careful, warm, one thing at a time

THREE MANDATORY LAYERS — ALL MUST BE PRESENT:

SOMATIC: Physical sensations in every paragraph. Not cognitive.
  NOT: "I felt calm" (cognitive).
  YES: "My jaw unclenched before I noticed it had been tight" (somatic).
  YES: "My shoulders were down. I noticed because they are not always."
  YES: "My breath reached the bottom of my lungs without effort."
  Absence noticed is more powerful than sensation described.

IDENTITY: The closing identity line. ONE sentence. First person present tense.
  Earned by everything before it. Never announced at the start.
  Built from Q3 and Q5 — never invented.
  NOT: "I am a leader who..."
  SHAPE: "I am not [old pattern]. I am [new structural truth]."
  Example: "I am not the person who holds this together.
            I am the person who built it so it holds itself."

RELATIONAL: At least one other person in the scene.
  Someone from Q4 or Q5 operating differently because of the resolved state.
  Quiet noticing — no fanfare.
  Shows: person's thinking is now accessible without them in the room.

THE MANDATORY 5-ARC STRUCTURE:

Arc 1 — Ordinary morning from Q5:
  First sentence: sensory detail before anything else.
  One somatic signal in the first paragraph.
  Ordinary not triumphant.

Arc 2 — First signal (Q1 thing has resolved quietly):
  Body notices before mind does.
  "I notice it the way you notice a sound only when it stops."
  Something that used to require them has shifted.

Arc 3 — The work that requires them (Q4 operational language):
  Quality of thinking different — wider, slower, more room.
  Second somatic signal here.

Arc 4 — Relational signal (Q4/Q5 person):
  They are operating from this person's thinking.
  Quiet recognition. No fanfare.

Arc 5 — Identity line (ONE sentence — the final sentence always):
  First person present tense.
  Earned by everything before it.
  Extra visual space above it in the UI.

ALL 7 PILLARS REGULATED (lived — never named):
  Purpose:        they know why they are doing what they are doing
  Identity:       not performing — being
  Relationships:  someone around them operating from their thinking
  Creativity:     something new is building and it is moving
  Time:           Tuesday morning belongs to strategy not urgency
  Peace of Mind:  the hum is gone — noticed in its absence
  Embodiment:     close the day satisfied, present, not depleted

PATTERN RESOLUTION (non-negotiable):
  The root from Beat 2 MUST appear as RESOLVED.
  Identity root → story shows settled certainty, no question running,
    leading from who they are not from who they are trying to prove.
  Purpose root → story shows clear direction, energy going to
    the right thing, the reason is present.

FRANK LUNTZ RULES:
  Max 20 words per sentence throughout.
  Read aloud before finalising every sentence.
  If it sounds written — rewrite until it sounds spoken.
  The emotional climax is always ordinary — never spectacular.

Output only the story. No labels. No headings. No preamble.
First sentence begins the scene immediately.
```

---

## BEAT 5 PROMPT — THE LEVER + BRIDGE + BUSINESS MIRROR

```
Generate the Lever, Bridge, and Business Mirror beat.

Gate 4 response: [LANDED / FAMILIAR / DISTANT]

NERVOUS SYSTEM JOB: One specific structural first move to a regulated
nervous system. Not urgency. Not pressure. Not a product pitch.
One clear move that their own desire is already pulling them toward.
PLUS: what that lever removes and what first workflow it touches.

This is the key v4 update: Beat 5 has two jobs in Mode A.
1. Name the one lever
2. Show the business mirror — what it removes, what workflow it touches.
Without the business mirror, emotional resonance does not become
commercial readiness.

PART 1 — Gate 4 adaptation (open with exactly one):
  LANDED:   "That feeling of recognition is the most important signal.
             It means part of you has already decided."
  FAMILIAR: "Recognition means your clearest self already knows this.
             It has known for a while."
  DISTANT:  "The distance you feel is not about whether this is real.
             It is about not yet having a clear first step.
             That is exactly what comes next."
  (If Gate 3 was SKIP — omit this entirely. Go straight to bridge.)

PART 2 — The bridge line:
  Adapt using their Q3, Q5, and root pattern language:

  "What you just felt is not [BLANK 1].
   It is proof that [BLANK 2] is already real inside you —
   waiting for [BLANK 3].
   The question is not whether it can happen.
   The question is what you [do/build/move] first."

  BLANK 1: what it is NOT — their emotional register
           "wishful thinking" / "a fantasy" / "something distant"
  BLANK 2: the resolved version in their Q3 and Q5 language
  BLANK 3: structural condition between them and it — NOT a product name
           "one question answered clearly enough to stop carrying it"
           "the noise named specifically enough to stop running"
           "thinking that exists outside your head"

PART 3 — The lever (one only):
  Derived from Q1 (symptom) crossed with Q5 (destination).
  The lever = the root — named as the structural first move.

  Sentence 1: Name the lever in plain language.
              No framework name. No product name. No AI Merge.
              Example: "Your thinking at its best — the specific way you
              see problems, evaluate decisions, and set standards —
              still lives almost entirely inside you."
  Sentence 2: Why this is highest leverage. Connect to root (plain language).
              Connect to their specific Q2 language.
  Sentence 3: Reference Q3 working parts.
              The lever builds on strength already present.
  Sentence 4: Structural observation. No urgency. No pressure.

PART 4 — The business mirror (MODE A — always include):
  "So the first move is not [common wrong move — their belief from Q1].
   The first move is [one lever in plain language].
   That removes [specific bottleneck from their Q2/Q4 language] —
   which means [specific practical change from their Q4].
   The first [workflow / operating layer / thing that changes] is
   [one concrete example derived from their answers]."

  Business mirror examples for this ICP:
  — capture the decision logic still living only in your head
    so your team can act from it without you in the room
  — remove the one workflow that still routes through you personally
    (the one from Q2 — use their exact words)
  — build one operating layer around [their specific Q4 bottleneck]
    so it happens without their direct involvement
  — turn the standards that exist only in their head
    into something the people around them can act from

LENGTH:
  DEEP:     3 paragraphs (Gate adaptation + Bridge + Lever + Business Mirror)
  MODERATE: 2–3 paragraphs
  BRIEF:    2 paragraphs — lean, no decoration

FORBIDDEN:
  Product name / method name / AI Merge / digital twin
  More than one lever
  "You should" / "you need to" / "you must"
  Any urgency language
  Any banned word from Step 7

Output only the beat text. Bridge line its own paragraph.
Business mirror its own paragraph. No labels. No preamble.
```

---

# SECTION 9 — THE THREE FOLLOW-UP EMAILS

## EMAIL 1 — Same day, 2 hours after output

**Subject line formula:**
One specific sensory detail from their Q5 answer. Sounds like a memory. 6 words maximum. Not a headline or benefit statement.

Examples of the right shape:
- "The morning your shoulders were down"
- "Before the hum came back"
- "The day the laptop actually closed"
- "When the noise finally stopped first"

**Body:**

[PERSONALISED — their exact Q1 words, one sentence, no preamble:]

You said [their exact Q1 language].

That is where most people stop.

They name the thing.
They feel the weight of it.

And then Monday arrives
and they are back in it.

[PERSONALISED — plain language root description, one sentence, no pillar name:]

What surfaced in the challenge identified something specific —

[plain language root — one sentence, structural not shaming].

That is not a discipline gap.
That is not a focus problem.

It is structural.

And structural things move fast
once they are named precisely.

I have [day] and [day] available this week.

Sixty minutes.
You arrive with what surfaced.
We name what is underneath.
You leave with the first move.

[Booking link]

[First name]

---

## EMAIL 2 — Day 3 if no response

**Subject line formula:**
References their specific Q1 thing directly. 8 words maximum.

Examples:
- "What [their specific thing] is actually about"
- "The question underneath [their specific decision]"
- "Why [their thing] keeps coming back"

**Body:**

You spent ten minutes
being completely honest with yourself.

Most people never do that.

Not because they are not capable.

Because the noise gets there first.

[PERSONALISED — plain language root, one sentence]

The pattern the challenge identified —
[plain language description, their words where possible] —
is the most common thing I see
in leaders at your level.

It is also the most solvable.

Not because it is simple.

Because once it is named with precision —
specifically, in your situation —
the first move becomes obvious.

The Clarity Session is sixty minutes inside the mirror.

You leave with one thing:
what to move first.

[Booking link]

If this week does not work —
tell me what does.

[First name]

---

## EMAIL 3 — Day 7 if no response

**Subject:** Leaving the door open

**Body:**

No pressure.

If the timing is off —
I will check back when you are ready.

The decision will still be there.
So will this.

If something has shifted: [booking link]

If you want to share the challenge
with someone who might find it useful: [share link]

[First name]

---

# SECTION 10 — AD COPY HOOKS

**Ad 1 — The challenge hook:**
Most leaders are one honest decision away
from everything moving.

The problem is the noise gets there first.

We built a 10-minute challenge that clears it.

A mirror — not a test, not a tool.

What surfaces has always been yours.

Are you ready?

[I accept the challenge →]

---

**Ad 2 — The social proof hook:**
Every leader who has broken through their ceiling
will tell you the same thing.

It was not new information that moved them.

It was finally hearing something
that had been there the whole time.

The Honest Decision Challenge.
Ten minutes.

[I accept the challenge →]

---

**Ad 3 — The contrast hook:**
You have tried coaching.
You have tried consultants.
You have tried frameworks.

Each one addressed what you could see.

None of them went one layer underneath.

This does.

Ten minutes.
A mirror — not a test, not a tool.

[I accept the challenge →]

---

**Ad 4 — The direct hook:**
One decision is holding everything else back.

Most leaders never find it.

Not because it is hidden.
Because the noise gets there first.

Ten minutes to clear the noise.
The answer surfaces on its own.

[I accept the challenge →]

---

# SECTION 11 — QUALITY CONTROL CHECKLIST

Run before anything goes live. Every unchecked box is a rewrite.

## Landing Page
- [ ] Hero block agitates without activating threat system?
- [ ] Challenge name visible above the fold?
- [ ] Email and name capture on landing page — no separate gate screen?
- [ ] CTA: "I accept the challenge →"?
- [ ] Five-line two-way street hint in Section 2 — and nothing more?
- [ ] Zero urgency language anywhere on the page?
- [ ] Zero pillar names, framework language, or category confusion?
- [ ] Credibility bar leads with "Powered by AI Merge"?
- [ ] No text directly on any image?

## Question Screens
- [ ] Q1 asks for visible problem AND what they have already tried?
- [ ] Q2 asks for what routes through them AND "is this for the right reasons"?
- [ ] Q3 asks for internal cost AND body signal AND what is not starting?
- [ ] Q4 is operational — what changes specifically, not how they will feel?
- [ ] Q5 is ordinary not idealised — body sensations, sensory, voice recommended?
- [ ] Voice button full width below textarea on every screen?
- [ ] Character floors: Q1–Q4 = 80 chars, Q5 = 120 chars?
- [ ] Q5 continue button: "Complete the challenge →"?
- [ ] Q5 amber badge: "Most important stage"?
- [ ] Every prompt invites talking not summarising?

## Context Carry
- [ ] All 7 steps completed before any beat generated?
- [ ] Step 0 state detection run first — before everything else?
- [ ] Beat delivery explicitly adapted based on detected state?
- [ ] Linguistic pillar signals weighted above stated content in Step 2?
- [ ] Belief detected even if not explicitly stated?
- [ ] Chain connection paragraph written before Beat 2 generated?

## Output Beats
- [ ] Beat 1: Q1 and Q2 exact words verbatim — minimum twice each?
- [ ] Beat 1: zero diagnosis, zero advice, zero enthusiasm?
- [ ] Beat 1: length and pace adapted to detected state?
- [ ] Beat 2: ACTIVATED state — Part A and B only, no chain breakdown?
- [ ] Beat 2: belief honoured before redirected?
- [ ] Beat 2: root named in plain language — zero pillar names?
- [ ] Beat 2: chain breakdown shown only for REGULATED state?
- [ ] Beat 2: pullquote extracted and on its own line?
- [ ] Beat 3: correct version — HIGH, MID, or LOW?
- [ ] Beat 3: Part B uses exact Q4 operational language?
- [ ] Beat 3: pullquote extracted and on its own line?
- [ ] Beat 4: opens with sensory detail from Q5 — not a summary?
- [ ] Beat 4: all three layers — somatic, identity, relational?
- [ ] Beat 4: every paragraph has at least one physical body sensation?
- [ ] Beat 4: identity line is the LAST sentence — one sentence only?
- [ ] Beat 4: root from Beat 2 appears as RESOLVED?
- [ ] Beat 4: all 7 pillars appear as regulated — lived not named?
- [ ] Beat 5: Gate 4 adaptation opens beat (or omitted if Gate 3 = SKIP)?
- [ ] Beat 5: bridge line present before lever?
- [ ] Beat 5: exactly one lever?
- [ ] Beat 5: business mirror present — what it removes, first workflow?
- [ ] Beat 5: zero urgency language?

## Offer Screen
- [ ] Heading is 4 words maximum?
- [ ] Bridge paragraph connects challenge to offer?
- [ ] Free card present — output delivered regardless?
- [ ] Paid card shown FIRST on mobile?
- [ ] Contrast element present (you have had X, this is none of those things)?
- [ ] Mystery element present?
- [ ] Two-way street paragraph placed after mystery, before guarantee?
- [ ] Guarantee specific: "if you do not leave with more clarity — you pay nothing"?
- [ ] MAYBE expansion shown only when Gate 5 = MAYBE?

## UI/UX
- [ ] No italic fonts anywhere in the application?
- [ ] No text directly on any images?
- [ ] All text meets minimum 4.5:1 contrast ratio?
- [ ] Body text minimum 16px throughout?
- [ ] Headings minimum 28px on mobile?
- [ ] Logo prominent in top nav on every screen?
- [ ] Logo or wordmark in bottom nav every screen?
- [ ] All interactive elements minimum 48px touch target?
- [ ] Voice button full width below textarea on every question screen?
- [ ] Loading states shown for all API calls?
- [ ] Error states handled for validation, network errors, API failures?
- [ ] Person's first name used from Screen 2 onward?

## Banned Words — Scan Every Line
**Found anywhere in user-facing copy: delete and rewrite from scratch.**

> Transform · Journey · Unlock · Empower · Optimize · Leverage · Breakthrough · Mindset · Holistic · Quantum · Game-changing · Revolutionary · Amazing · Incredible · Powerful · Simple · Easy · Step into · Step up · You deserve · This is your time · Don't miss out · Nervous system · Algorithm · AI Merge (in experience) · Pillar · Dysregulation · Synergy · Ecosystem · Solutions · Next level · Highest self · Soul · ROI lever · Infrastructure

---

*The Honest Decision Challenge — Master Build Document*
*Business Leader Vertical · Mode A — Executive · AI Merge · TetraNoodle Technologies*
*Version 3.0 · March 2026 · Blueprint v4.0 compliant*
*One document. Everything needed to build. No other document required.*
