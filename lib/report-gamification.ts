/**
 * The 30-Day Board - the gamified action-plan page of the paid report,
 * configured per vertical.
 *
 * DESIGN CONSTRAINTS (from the B2C Conversion Strategy, Part 6 - these are
 * hard rules, not preferences):
 *
 *  - NO STREAKS, ANYWHERE, EVER. Streaks punish exactly the inconsistency
 *    that defines the ADHD audience; a broken streak is a shame event that
 *    reactivates "I abandon systems" and produces churn, not retention.
 *  - COUNT RETURNS INSTEAD. Re-engaging after a lapse IS the target
 *    behaviour, so the comeback is the celebrated unit ("coming back is the
 *    skill"). The return counter is never shown as zero.
 *  - UNLOCKS ARE CONTENT, NOT BADGES. The reward for doing the work is more
 *    capability, which keeps motivation intrinsic-adjacent rather than
 *    sticker-based. Every milestone below unlocks a real page/section of
 *    this same report.
 *  - NOTHING EXPIRES, NOTHING IS TIME-LOCKED, NOTHING IS LOST BY LAPSING.
 *    No countdowns, no "don't lose your progress", no loss framing.
 *  - NEVER RANK OR COMPARE SEVERITY. No leaderboards, no "most improved".
 *
 * The board is deliberately ANALOG (ink a circle on a printed page). That is
 * not a limitation of PDF - it is the safest possible mechanic for this
 * audience: no app to abandon, no notification to resent, no streak state
 * that can break while you are not looking.
 *
 * B2B (healthcare) does NOT get consumer gamification - it is explicitly
 * banned for that register. It gets the Evidence Loop instead
 * (hypothesis -> bounded test -> evidence -> decision), which is the B2B
 * strategy's own stated equivalent: the same structured momentum toward a
 * completion event, in a form a COO would defend.
 */

import type { Vertical } from "@/lib/verticals"

export interface BoardMilestone {
  /** How many catches unlock it. */
  at: number
  label: string
  /** What it unlocks - always real content, never a badge. */
  unlocks: string
}

export interface BoardConfig {
  variant: "board" | "evidence-loop"
  eyebrow: string
  title: string
  /** The one-paragraph framing under the title. */
  lede: string
  /** Label above the row of catch circles. */
  catchesLabel: string
  /** The rule that makes gaps structurally impossible to "fail". */
  catchesRule: string
  catchCount: number
  returnsLabel: string
  returnsRule: string
  returnCount: number
  milestones: BoardMilestone[]
  /** The day-30 completion event (the "crown event"). */
  finishLabel: string
  finishBody: string
  /** Closing permission line - the anti-shame guarantee. */
  closingLine: string
  /** Heading for the open ruled writing area. */
  notesLabel: string
}

const B2C_BOARD: Omit<BoardConfig, "lede" | "closingLine" | "title"> = {
  variant: "board",
  eyebrow: "Your 30-day board",
  catchesLabel: "Catches",
  catchesRule:
    "Ink one circle each time you catch the moment - whether or not you ran the move. Noticing counts. There are no dates on these, so a gap is not a miss.",
  catchCount: 12,
  returnsLabel: "Returns",
  returnsRule:
    "Mark one every time you pick this up again after a pause - including today. Coming back is the skill this whole plan is built on.",
  returnCount: 6,
  milestones: [
    { at: 1, label: "First catch", unlocks: "Your pocket line - carry it into the next one." },
    { at: 3, label: "Three catches", unlocks: "The week-two note: what it means when the pattern argues back." },
    { at: 7, label: "Seven catches", unlocks: "Your day-30 re-score - see what actually moved." },
  ],
  notesLabel: "What you noticed",
  finishLabel: "Day 30 · the check",
  finishBody:
    "Read your log back, then re-take the score. The number matters less than the entries - those are evidence in your own handwriting.",
}

export const BOARD_CONFIG: Record<Vertical, BoardConfig> = {
  main: {
    ...B2C_BOARD,
    title: "One moment at a time.",
    lede:
      "This is the working surface of your plan. It is not a tracker to keep up with - it is a place to record what you notice. Print it, or keep it open. One page, thirty days, no maintenance.",
    closingLine:
      "There is no streak here to break and nothing on this page expires. If two weeks pass untouched, the next mark is a return, not a restart.",
  },
  retargeting: {
    ...B2C_BOARD,
    title: "One moment at a time.",
    lede:
      "This is the working surface of your plan. It is not a tracker to keep up with - it is a place to record what you notice. Print it, or keep it open. One page, thirty days, no maintenance.",
    closingLine:
      "There is no streak here to break and nothing on this page expires. If two weeks pass untouched, the next mark is a return, not a restart.",
  },
  adhd: {
    ...B2C_BOARD,
    title: "No streaks. No system. One moment at a time.",
    lede:
      "You have bought the planners. This is not one. There is nothing here to maintain, no daily hour, and no streak to break - just a place to mark what you catch, whenever you catch it. A blank week costs you nothing.",
    catchesRule:
      "Ink one circle each time you catch the moment - whether or not you did anything about it. Noticing IS the move. No dates, so there is no such thing as falling behind.",
    returnsRule:
      "Mark one every time you come back to this after a gap - including today. For this pattern, returning after a lapse is the target behaviour, not the apology.",
    milestones: [
      { at: 1, label: "First catch", unlocks: "Your pocket line - carry it into the next one." },
      { at: 3, label: "Three catches", unlocks: "The week-two note: what it means when the pattern argues back." },
      { at: 7, label: "Seven catches", unlocks: "Your day-30 re-score - see what actually moved." },
    ],
    finishBody:
      "Read your log back, then re-take the score. The number matters less than the entries - they are proof in your own handwriting that the loop was catchable.",
    closingLine:
      "Nothing on this page expires, and nothing here can be broken. If a month passes untouched, the next mark is a return - and returns are what this plan counts.",
  },
  healthcare: {
    variant: "evidence-loop",
    eyebrow: "Your first-proof tracker",
    title: "Hypothesis. Bounded test. Evidence.",
    lede:
      "This Profile is built from one leader's account, so it is a hypothesis to test against the organization - not a finding to accept. The tracker below is how you test it cheaply, inside 30 days, without new headcount.",
    catchesLabel: "Observations",
    catchesRule:
      "Log each occurrence of the operating moment during the test window - date, who absorbed it, and how long it took. Counts beat impressions when the conversation goes upstairs.",
    catchCount: 12,
    returnsLabel: "Checkpoints",
    returnsRule:
      "Three scheduled reviews across the window: baseline, midpoint, and the day-30 evaluation. Mark each when it happens.",
    returnCount: 3,
    milestones: [
      { at: 1, label: "Baseline set", unlocks: "The metric and its current value, recorded before any change." },
      { at: 2, label: "Midpoint review", unlocks: "The honest-evaluation questions - is the intervention holding?" },
      { at: 3, label: "Day-30 evaluation", unlocks: "The decision: adopt, adjust, or discard - with evidence behind it." },
    ],
    notesLabel: "Observations and notes",
    finishLabel: "Day 30 · the evaluation",
    finishBody:
      "Compare the count and the time cost against your baseline. If the loop closed, you have a defensible result to take upstairs. If it did not, you have a cheap, bounded answer - which is also worth having.",
    closingLine:
      "This is a deliverable, not a doorway. What you do with the result stays entirely yours, and nobody calls you.",
  },
  // Coaches and consultants keep the B2C board's anti-shame mechanics (no
  // streaks, no dates, nothing expires) but the SECOND row is repurposed from
  // "returns" to "evidence". The whole public mechanism for this vertical ends
  // at "the next evidence" - one observable commercial action - so the thing
  // most worth counting is completed invitations, not comebacks. The
  // no-shame guarantee still lives in catchesRule and closingLine, which is
  // where it does its work; nothing here can be broken or fallen behind on.
  coaches: {
    ...B2C_BOARD,
    title: "One moment. One completed invitation.",
    lede:
      "This is the working surface of your plan. It is not a pipeline tracker and not another system to maintain - it is a place to record two things: when you caught the moment, and when you completed the commercial action anyway. One page, thirty days, no maintenance.",
    catchesLabel: "Catches",
    catchesRule:
      "Ink one circle each time you notice the pull to add more - another explanation, another resource, another revision - before naming the next step. Noticing counts on its own. There are no dates on these, so a quiet week is not a miss.",
    catchCount: 12,
    returnsLabel: "Evidence",
    returnsRule:
      "Mark one every time you complete the commercial action anyway: a recommendation named, a proposal sent, a follow-up closed, a price stated without qualifying it. This row is the only proof that matters, and it does not reset.",
    returnCount: 6,
    milestones: [
      {
        at: 1,
        label: "First catch",
        unlocks: "Your pocket line - the sentence to use in the moment before you add more.",
      },
      {
        at: 3,
        label: "Three catches",
        unlocks: "The week-two note: what to do when a direct recommendation gets a slow answer.",
      },
      {
        at: 7,
        label: "Seven catches",
        unlocks: "Your day-30 re-score - see which of the four pillars actually moved.",
      },
    ],
    notesLabel: "What you noticed, and what the client did next",
    finishBody:
      "Read your log back, then re-take the score. Count the entries in the Evidence row against the month before this one. That count is a market answer in your own handwriting - which is the only kind that settles the question.",
    closingLine:
      "There is no streak here to break and nothing on this page expires. A blank fortnight costs you nothing, and the next mark picks up exactly where the last one left off.",
  },
  // Parents keep the B2C board's anti-shame mechanics (no streaks, no dates,
  // nothing expires) with the SECOND row repurposed from "returns" to
  // "noticed". That is this vertical's own documented mechanism rather than a
  // borrowed one: its lead ICP records a parent whose behavioural evidence
  // consistently outweighs the anxious narrative, and the VSL's central line
  // is that the response meant to help "can make it harder to see the evidence
  // already in front of you". So the second unit worth counting is the parent
  // letting a piece of what is already there land, without discounting it.
  //
  // CRITICAL: this row counts the PARENT registering something, never the
  // child doing something. "I noticed and let it land" is in scope; "he texted
  // me back" as a tallied win would make the child the scored subject and
  // would tie the plan's progress to another person's behaviour - which every
  // ad in this vertical is explicitly prohibited from promising.
  parents: {
    ...B2C_BOARD,
    title: "One moment at a time.",
    lede:
      "This is the working surface of your plan. It is not a parenting tracker and not a record of how your child is doing - it is a place to note two things: when you caught the moment, and when you let something you already had in front of you actually land. One page, thirty days, no maintenance.",
    catchesLabel: "Catches",
    catchesRule:
      "Ink one circle each time you catch the moment - the point where the situation starts meaning something larger, before the familiar response takes over. Noticing counts whether or not you did anything differently. There are no dates on these, so a quiet week is not a miss.",
    catchCount: 12,
    returnsLabel: "Noticed",
    returnsRule:
      "Mark one every time you register something that was already there and let it stand without discounting it - a message, a moment together, a thing they handled on their own. This row is about what you allowed yourself to see, not about anything your child had to do differently.",
    returnCount: 6,
    milestones: [
      {
        at: 1,
        label: "First catch",
        unlocks: "Your pocket line - the sentence to use in the moment before the familiar response arrives.",
      },
      {
        at: 3,
        label: "Three catches",
        unlocks: "The week-two note: what to do when the practical concern is genuinely real.",
      },
      {
        at: 7,
        label: "Seven catches",
        unlocks: "Your day-30 re-score - see which of the four pillars actually moved.",
      },
    ],
    notesLabel: "What you noticed",
    finishBody:
      "Read your log back, then re-take the score. The number matters less than the entries - those are your own record of what was actually happening, in your handwriting, next to the story you were telling about it.",
    closingLine:
      "There is no streak here to break and nothing on this page expires. A blank fortnight costs you nothing, and this page never becomes one more thing you are behind on.",
  },
}

export function boardConfigFor(vertical: Vertical | null | undefined): BoardConfig {
  return BOARD_CONFIG[vertical ?? "main"] ?? BOARD_CONFIG.main
}
