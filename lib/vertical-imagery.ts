/**
 * Per-vertical funnel imagery - the hero photo beside each question and each
 * beat, and its alt text.
 *
 * These are NOT decorative backgrounds. Each renders as a 16:9 hero with a
 * Ken Burns zoom, priority-loaded, directly beside the question a person is
 * answering, on all ten screens. They carry as much register as the copy does.
 *
 * The shared defaults below are the images the funnel has always used, and
 * their alt text is written for the original leadership/business audience
 * ("the noise pulling at a leader's attention"). That is correct for main,
 * retargeting and healthcare, and plainly wrong on a parenting funnel - which
 * is why this file exists. Verticals opt in; anything not overridden keeps the
 * shared default byte for byte.
 *
 * THE PARENTS RULE (source docs, non-negotiable): the parent is the subject,
 * the child is context. A child may appear, but a child's face may never carry
 * the emotion of the scene, and no frame may show conflict, distress, or a
 * child who reads as the problem. The ad matrix says this per-ad - "Do not
 * show an angry, isolated or troubled teenager", "keep the student partially
 * visible and emotionally neutral", "no third party shown as the problem" -
 * and the landing page requires that result imagery "must not resemble a score
 * for the child". A sullen teenager beside question one would contradict the
 * one promise this vertical makes, at the exact moment someone is typing about
 * their child.
 *
 * The parents set therefore arcs: the parent is alone through the moment, the
 * meaning, the cost and the loop (Q1-Q4, beats 1-3), and parent and child
 * appear together only from the ordinary-week questions onward (Q5, beats
 * 4-5), where the copy has earned it. Togetherness is the destination, not the
 * premise.
 *
 * WHY FOUR OF THEM ARE EMPTY ROOMS (Q2, Q3, beats 2 and 3). Those screens ask
 * about the parent's interior state - what the moment came to mean, what it
 * costs, why the loop holds. Stock photography cannot cast that: searches for
 * a parent aged 40-55 alone and thoughtful return either people in their
 * twenties coded as lonely, people in their seventies, or outright depression
 * imagery (a search for a middle-aged parent alone in the evening came back
 * as men drinking alone in dark rooms). Rather than put a performed emotion
 * next to the most delicate questions in the funnel, those four are ordinary
 * domestic rooms with nobody in them - the space where this happens. The set
 * therefore reads: people on the screens about people, rooms on the screens
 * about what is happening inside. If these are ever recast with real people,
 * keep that split; a stock model performing "thoughtful but fine" beside
 * "what does this cost you" is worse than an empty room.
 *
 * PROVENANCE. All ten are Pexels free-commercial-use photos, cropped to 1600x900.
 * AI-generated Pexels results (content.pexels.com/aigc-bundle/) were excluded
 * throughout - they carry different terms. Source ids, for tracing or replacing:
 *   q1 6927197 · q2 3987481 · q3 5997926 · q4 15130537 · q5 8074594
 *   beat1 7117499 · beat2 5490356 · beat3 11039837 · beat4 5813745 · beat5 8075909
 * Q5 and beat 5 are deliberately from the same shoot so the two "together"
 * screens read as one family rather than two stock families.
 */

import type { Vertical } from "@/lib/verticals"

export interface FunnelImage {
  src: string
  alt: string
}

/** 1-indexed position of a question or beat within its five. */
export type SlotNumber = 1 | 2 | 3 | 4 | 5

/** The original shared set. Unchanged - every non-overriding vertical gets it. */
const DEFAULT_QUESTIONS: Record<SlotNumber, FunnelImage> = {
  1: {
    src: "/images/q1-conversation.jpg",
    alt: "Two figures in quiet conversation across a low table - question 1 of the AIMerge clarity diagnostic asks what isn't moving the way it should.",
  },
  2: {
    src: "/images/q2-horizon.jpg",
    alt: "A wide horizon opening across calm water - question 2 of the AIMerge clarity diagnostic asks what twelve months from now actually looks like.",
  },
  3: {
    src: "/images/q3-nature.jpg",
    alt: "A weathered branch curling through still air - question 3 of the AIMerge clarity diagnostic surfaces the noise pulling at a leader's attention.",
  },
  4: {
    src: "/images/q4-confident.jpg",
    alt: "A figure standing with quiet certainty against open sky - question 4 of the AIMerge clarity diagnostic asks about the moment a leader's most capable self showed up.",
  },
  5: {
    src: "/images/q5-morning.jpg",
    alt: "An early morning room with light easing across the floor - question 5 of the AIMerge clarity diagnostic asks a leader to describe the morning the noise is gone.",
  },
}

const DEFAULT_BEATS: Record<SlotNumber, FunnelImage> = {
  1: {
    src: "/images/beat-1-mirror.jpg",
    alt: "A still mirror catching first light - the AIMerge clarity diagnostic reflects what your own answers reveal back to you in reflection 1 of 5.",
  },
  2: {
    src: "/images/beat-2-direction.jpg",
    alt: "An open horizon stretching forward - reflection 2 of the AIMerge clarity diagnostic surfaces the direction your subconscious has already chosen.",
  },
  3: {
    src: "/images/beat-3-noise.jpg",
    alt: "Quiet water disturbed by ripples - reflection 3 of the AIMerge clarity diagnostic names the structural noise pulling at a leader's attention.",
  },
  4: {
    src: "/images/beat-4-pattern.jpg",
    alt: "A pattern of light tracing through stone - reflection 4 of the AIMerge clarity diagnostic recalls the conditions under which a leader's most capable self showed up.",
  },
  5: {
    src: "/images/beat-5-clarity.jpg",
    alt: "A still morning room flooded with quiet light - reflection 5 of the AIMerge clarity diagnostic shows the one decision that clears the interference.",
  },
}

/**
 * Parents. Alt text is written for THIS reader: no "leader", no business
 * vocabulary, and it never describes a child's emotional state - it describes
 * the scene and what the screen asks the parent.
 */
const PARENTS_QUESTIONS: Record<SlotNumber, FunnelImage> = {
  1: {
    src: "/images/parents/q1-the-moment.jpg",
    alt: "A parent pausing at a kitchen counter, phone within reach - question 1 of the Parenting Belief Score asks about one parenting moment that keeps repeating.",
  },
  2: {
    src: "/images/parents/q2-the-meaning.jpg",
    alt: "A quiet sitting room in the evening, lamp on and nobody in it - question 2 of the Parenting Belief Score asks what the moment began to mean.",
  },
  3: {
    src: "/images/parents/q3-the-cost.jpg",
    alt: "A lamp lit late in a dim room, a cup left on the table beside an empty chair - question 3 of the Parenting Belief Score asks what the pattern quietly uses up.",
  },
  4: {
    src: "/images/parents/q4-the-hard-no.jpg",
    alt: "A well-read book set down and closed at home - question 4 of the Parenting Belief Score asks what has already been tried, and what is not worth trying again.",
  },
  5: {
    src: "/images/parents/q5-ordinary-week.jpg",
    alt: "A parent and their teenager in an unremarkable morning at home, both at ease - question 5 of the Parenting Belief Score asks what an ordinary week looks like with one loop closed.",
  },
}

const PARENTS_BEATS: Record<SlotNumber, FunnelImage> = {
  1: {
    src: "/images/parents/beat-1-the-moment.jpg",
    alt: "A parent pausing in a hallway, mid-decision - reflection 1 of the Parenting Belief Score reflects back the repeated moment in their own words.",
  },
  2: {
    src: "/images/parents/beat-2-the-meaning.jpg",
    alt: "An ordinary front room in soft daylight, cushions and plants, nobody in it - reflection 2 of the Parenting Belief Score names what the moment may have come to mean.",
  },
  3: {
    src: "/images/parents/beat-3-the-loop.jpg",
    alt: "The same familiar room in changed light - reflection 3 of the Parenting Belief Score shows how the response that settles the moment also produces the next one.",
  },
  4: {
    src: "/images/parents/beat-4-moment-to-notice.jpg",
    alt: "A parent and their teenager passing each other at home in an ordinary moment - reflection 4 of the Parenting Belief Score names the earliest point where more choice is available.",
  },
  5: {
    src: "/images/parents/beat-5-already-there.jpg",
    alt: "A parent and their teenager sitting near one another, unhurried - reflection 5 of the Parenting Belief Score points at the evidence already in front of them.",
  },
}

const OVERRIDES: Partial<
  Record<Vertical, { questions: Record<SlotNumber, FunnelImage>; beats: Record<SlotNumber, FunnelImage> }>
> = {
  parents: { questions: PARENTS_QUESTIONS, beats: PARENTS_BEATS },
}

/** The hero image for a question screen. Falls back to the shared default. */
export function questionImage(vertical: Vertical, n: SlotNumber): FunnelImage {
  return OVERRIDES[vertical]?.questions[n] ?? DEFAULT_QUESTIONS[n]
}

/** The hero image for a beat screen. Falls back to the shared default. */
export function beatImage(vertical: Vertical, n: SlotNumber): FunnelImage {
  return OVERRIDES[vertical]?.beats[n] ?? DEFAULT_BEATS[n]
}
