/**
 * Per-vertical DISPLAY configuration for the score/report/offer surfaces -
 * the hardcoded-in-code counterpart to the Cosmos content packs. Covers what
 * admin-editable prompts can't: pillar labels rendered by the report and
 * summary UI, the report artifact's name, and which offer page variant a
 * vertical uses.
 *
 * The four subscore KEYS (directionClarity, identityAlignment,
 * decisionReadiness, energyAlignment) are fixed across the whole system -
 * scoring, storage, and the LLM JSON contract all use them. Verticals only
 * relabel what those keys MEAN to their reader: the healthcare score prompt
 * (belief-score-config-healthcare.json) redefines each dimension in
 * operational terms, and these labels are the rendered names for the same
 * redefinition. Keep prompt rubric and label in sync per vertical.
 */

import type { Vertical } from "@/lib/verticals"

export interface PillarLabel {
  label: string
  /** Small over-line above the label (e.g. "Pillar I · Purpose"). */
  pillar: string
  /**
   * The label said in everyday words, for a reader who has never seen the
   * term before. Printed directly under the label wherever a score appears,
   * so no number in the report is ever unexplained. Keep it to one short
   * sentence, second person, no vocabulary from the label itself.
   */
  plain: string
}

export type PillarKey =
  | "directionClarity"
  | "identityAlignment"
  | "decisionReadiness"
  | "energyAlignment"

export interface VerticalDisplay {
  /** The vertical this config belongs to - lets consumers that only receive
   *  the display object (e.g. the report's context) resolve sibling
   *  per-vertical config such as the 30-day board. */
  id: Vertical
  /** The free product's public name (One-Name Law: exactly one per vertical). */
  productName: string
  /** The paid report artifact's name - toolbar, cover, page footers, PDF. */
  reportName: string
  pillarLabels: Record<PillarKey, PillarLabel>
  /** What this vertical calls one of its four measures, lower-case, singular
   *  and plural ("pillar"/"pillars" for B2C, "dimension"/"dimensions" for the
   *  operational register). Used in running copy so the orientation page never
   *  contradicts the labels above it. */
  measureNoun: string
  measureNounPlural: string
  /**
   * The plain-language orientation page ("How to read this"), per vertical.
   * Every phrase here has to survive a reader who skipped the funnel copy -
   * it is the page that answers "what am I actually looking at, and what do I
   * do first?" before any score or narrative appears.
   */
  howToRead: {
    /** What this document is, in two sentences, no product vocabulary. */
    what: string
    /** What the overall number does and does not mean. */
    scoreMeaning: string
    /** What the four measures are, collectively, in one sentence. */
    measuresMeaning: string
    /** The single instruction: what to do first, today. */
    firstThing: string
    /** Words this vertical uses that a first-time reader may not know. */
    glossary: { term: string; meaning: string }[]
  }
  /** Which offer page this vertical renders. */
  offerVariant: "b2c" | "b2b"
  /** Optional vertical-specific reassurance line on the B2C offer page
   *  (e.g. the ADHD anti-system line from the B2C conversion strategy). */
  offerAccent?: string
}

const B2C_PILLARS: Record<PillarKey, PillarLabel> = {
  directionClarity: {
    label: "Direction Clarity",
    pillar: "Pillar I · Purpose",
    plain: "How clearly you can say what you actually want, in your own words.",
  },
  identityAlignment: {
    label: "Identity Alignment",
    pillar: "Pillar II · Identity",
    plain: "How closely the way you act matches the person you feel you are.",
  },
  decisionReadiness: {
    label: "Decision Readiness",
    pillar: "Pillar III · Peace of Mind",
    plain: "How ready you are to make the call instead of going round again.",
  },
  energyAlignment: {
    label: "Energy Alignment",
    pillar: "Pillar IV · Embodiment",
    plain: "How much of your energy this pattern is quietly using up.",
  },
}

/** Shared B2C orientation copy - main and retargeting are the same product. */
const B2C_HOW_TO_READ: VerticalDisplay["howToRead"] = {
  what: "This is a plan, not a test result. It was written from the five answers you typed in your own words, so everything in it should sound like your situation and not like general advice.",
  scoreMeaning:
    "The big number is a starting point, not a grade. It says how much room there is to move right now. A lower number means more to gain, not that something is wrong with you.",
  measuresMeaning:
    "The four smaller numbers break that starting point into four parts, so you can see which one is holding the most back. Each one is explained in plain words next to its score.",
  firstThing:
    "Go to the action page and do Step 1. It is meant to take a few minutes, today, with nothing to buy and nothing to set up. The rest of the plan builds on it.",
  glossary: [
    {
      term: "The pattern",
      meaning:
        "The thing that keeps happening to you in the same way - the situation you described in your first answer.",
    },
    {
      term: "The belief underneath it",
      meaning:
        "The conclusion you may have drawn from that happening over and over. We name it as a possibility to check, never as a fact about you.",
    },
    {
      term: "The moment to watch",
      meaning:
        "The earliest point where you can tell the pattern is starting. Catching it there is what makes anything else possible.",
    },
    {
      term: "A move",
      meaning:
        "One small thing to do in that moment. Every move here is small enough to finish in one go and needs no new app, system, or routine.",
    },
  ],
}

export const VERTICAL_DISPLAY: Record<Vertical, VerticalDisplay> = {
  main: {
    id: "main",
    productName: "Belief Score",
    reportName: "Personalized 30-Day Action Plan",
    pillarLabels: B2C_PILLARS,
    measureNoun: "pillar",
    measureNounPlural: "pillars",
    howToRead: B2C_HOW_TO_READ,
    offerVariant: "b2c",
  },
  // Retargeting re-enters the SAME product (recovery-system doc: never a
  // variant, never a retake) - identical display to main.
  retargeting: {
    id: "retargeting",
    productName: "Belief Score",
    reportName: "Personalized 30-Day Action Plan",
    pillarLabels: B2C_PILLARS,
    measureNoun: "pillar",
    measureNounPlural: "pillars",
    howToRead: B2C_HOW_TO_READ,
    offerVariant: "b2c",
  },
  adhd: {
    id: "adhd",
    productName: "ADHD Belief Score",
    // Vertical-specific artifact name: an ADHD buyer's PDF, cover, footers
    // and filename all say ADHD. (The One-Name Law governs the FREE product
    // name; the paid artifact carries the vertical the same way.)
    reportName: "ADHD 30-Day Action Plan",
    // Matches the ADHD score rubric: dimension 1 scores how clearly the
    // PATTERN is seen; dimension 2 scores the distance between the pattern
    // and the self ("something that happens" vs "something I am").
    pillarLabels: {
      directionClarity: {
        label: "Pattern Clarity",
        pillar: "Pillar I · The Pattern",
        plain: "How clearly you can see the pattern while it is happening.",
      },
      identityAlignment: {
        label: "Identity Distance",
        pillar: "Pillar II · Identity",
        plain: "How much you see this as something you do, not something you are.",
      },
      decisionReadiness: {
        label: "Decision Readiness",
        pillar: "Pillar III · Peace of Mind",
        plain: "How ready you are to try one small thing differently.",
      },
      energyAlignment: {
        label: "Energy Alignment",
        pillar: "Pillar IV · Embodiment",
        plain: "What this pattern costs you in energy, and how much of that you notice.",
      },
    },
    measureNoun: "pillar",
    measureNounPlural: "pillars",
    howToRead: {
      what: "This is a plan, not a test result and not a diagnosis. It was written from the five answers you typed in your own words, so it should sound like your life and not like general ADHD advice.",
      scoreMeaning:
        "The big number is a starting point, not a grade. It says how much room there is to move right now. A lower number means more to gain - it is not a measure of how bad things are.",
      measuresMeaning:
        "The four smaller numbers break that starting point into four parts, so you can see which one is holding the most back. Each one is explained in plain words next to its score.",
      firstThing:
        "Go to the action page and do Step 1. There is no system to set up and no streak to keep. If you put this down for two weeks and come back, you pick up exactly where you left it.",
      glossary: [
        {
          term: "The pattern",
          meaning:
            "The thing that keeps repeating - the situation you described in your first answer. Not a personality trait, and not a failure of effort.",
        },
        {
          term: "The verdict",
          meaning:
            "What all those repeats may have taught you to believe about yourself. We name it so you can look at it, not because it is true.",
        },
        {
          term: "The hinge moment",
          meaning:
            "The earliest second where you can tell the pattern is starting. It is the only moment you need to catch.",
        },
        {
          term: "A move",
          meaning:
            "One small action inside that moment. Small enough to finish, needs no new app or planner, and skipping it costs you nothing.",
        },
      ],
    },
    offerVariant: "b2c",
    // Speaks directly to the graveyard of abandoned planners (Fear 4, the
    // dominant purchase fear for this vertical per the B2C strategy).
    offerAccent:
      "No new system to maintain, no daily hour, no streak to break.",
  },
  healthcare: {
    id: "healthcare",
    // MESSAGE MATCH with the B2B landing page, which is explicit that the
    // free OFFER is the "Healthcare Operations Belief Score" and that it
    // PRODUCES a "Belief Profile". Using the output's name as the offer's
    // name meant a visitor clicked "Get Your Free Healthcare Operations
    // Belief Score" and landed on "Get Your Free Belief Profile" - two
    // names for one thing at the exact moment of highest doubt.
    // "Belief Profile" remains correct for the RESULT (summary/report copy).
    productName: "Operations Belief Score",
    reportName: "Healthcare Operations Action Plan",
    // Operational register (B2B strategy: no psychology vocabulary anywhere
    // in written B2B assets) - same keys, org-level meanings, mirroring the
    // healthcare score prompt's rubric.
    pillarLabels: {
      directionClarity: {
        label: "Pattern Precision",
        pillar: "Dimension I · The Loop",
        plain: "How exactly you can point to the moment this loop starts.",
      },
      identityAlignment: {
        label: "Ownership Clarity",
        pillar: "Dimension II · Ownership",
        plain: "How clear it is who would own this if it were fixed for good.",
      },
      decisionReadiness: {
        label: "Test Readiness",
        pillar: "Dimension III · Evidence",
        plain: "How ready you are to run one small, bounded test of the fix.",
      },
      energyAlignment: {
        label: "Capacity Realism",
        pillar: "Dimension IV · Capacity",
        plain: "Whether the change you described fits the time and people you actually have.",
      },
    },
    measureNoun: "dimension",
    measureNounPlural: "dimensions",
    howToRead: {
      what: "This is a working document built from the five answers you gave about one recurring operational moment. It is one informed perspective, written up - not an audit, a compliance finding, or a full diagnosis of your organization.",
      scoreMeaning:
        "The overall number describes how ready this specific loop is to be tested, based on how precisely you were able to describe it. It is a starting point for a test, not a rating of your team or your systems.",
      measuresMeaning:
        "The four smaller numbers break that readiness into four parts, so you can see which part needs sharpening before a test is worth running. Each one is explained in plain words next to its score.",
      firstThing:
        "Go to the action page and start with Step 1. It is one observation you can make inside your existing workflow this week, with no new headcount, no new platform, and no meeting to schedule.",
      glossary: [
        {
          term: "The loop",
          meaning:
            "The recurring moment you described: the trigger arrives, someone resolves it, nothing is captured, and it comes back.",
        },
        {
          term: "Operating assumption",
          meaning:
            "A rule the organization repeatedly acts as though true - visible in workflows, ownership, and escalation. A hypothesis to test, not a judgment of anyone.",
        },
        {
          term: "Bounded test",
          meaning:
            "One small change, in one workflow, for a fixed window, with a number recorded before and after. Cheap enough that a negative result still pays for itself.",
        },
        {
          term: "First evidence",
          meaning:
            "The earliest thing someone outside your team could see change. It is what makes the next conversation about facts rather than impressions.",
        },
      ],
    },
    offerVariant: "b2b",
  },
}

export function displayFor(vertical: Vertical | null | undefined): VerticalDisplay {
  return VERTICAL_DISPLAY[vertical ?? "main"] ?? VERTICAL_DISPLAY.main
}
