import type { ApiResponse } from "@/components/challenge/clarity-report"

/**
 * Hardcoded sample report used only by the admin report preview (?preview)
 * when the current session has no completed assessment. This is the real
 * output captured from the "Alex" test run (see demo/ai-sample-output.md) so
 * the preview shows a genuinely representative layout - four pillars, five
 * beats, themes, and takeaways all populated - rather than an empty state.
 *
 * NOT used in any customer-facing path; only the preview fallback references
 * it. The display name is exposed separately so the banner and headings read
 * "Alex" consistently.
 */
export const SAMPLE_REPORT_NAME = "Alex"

export const SAMPLE_REPORT: ApiResponse = {
  clarity: {
    overall: 62,
    subscores: {
      directionClarity: 61,
      identityAlignment: 58,
      decisionReadiness: 63,
      energyAlignment: 68,
    },
    band: "good",
    bandLabel: "Strong foundation",
    bandMessage: "Solid ground. Sharpen what compounds.",
    benchmarkMean: 48,
    comparisonLabel:
      "Most people start near 48. You are at 62 today, which is your baseline to move from.",
    subscoreDetails: [
      { key: "directionClarity", label: "Direction Clarity", pillar: "Purpose", weight: 0.35, value: 61 },
      { key: "identityAlignment", label: "Identity Alignment", pillar: "Identity", weight: 0.25, value: 58 },
      { key: "decisionReadiness", label: "Decision Readiness", pillar: "Peace of Mind", weight: 0.25, value: 63 },
      { key: "energyAlignment", label: "Energy Alignment", pillar: "Embodiment", weight: 0.15, value: 68 },
    ],
  },
  reasons: {
    directionClarity:
      "He names the likely issue as \"letting go of a product line I'm emotionally attached to\" and Q5 describes \"the one thing that matters\" and saying no.",
    identityAlignment:
      "He admits \"I'm emotionally attached to\" the first product line and \"I don't need more information,\" which reads more self-aware than performative.",
    decisionReadiness:
      "He identifies a concrete block in Q2 and names a specific move in Q4: \"close the door on hiring another expensive consultant.\"",
    energyAlignment:
      "He gives clear body and felt-sense cues: \"I stop sleeping well,\" \"My chest gets tight,\" and in Q5 he wants to wake up \"without dread.\"",
  },
  nsState: "PURPOSE-ROOT",
  report: {
    headline: "You already know the decision; you are still paying to avoid it.",
    thread:
      "Everything in your answers points to one avoided cut. The business plateau, the unfinished initiatives, the tight chest, the short fuse at home, even the pull toward low-value work all trace back to protecting something you built first. You are not missing insight. You are carrying attachment longer than the business can afford.",
    pillars: [
      {
        key: "directionClarity",
        narrative:
          "Your direction is not unclear in the usual sense. You said, \"If it were obvious I'd have fixed it already,\" then named the real issue: letting go of a product line you are emotionally attached to because you built it first. That means clarity is present, but blocked by loyalty to an earlier version of the business. Flat revenue and a team that feels busy without moving the needle are the cost of leaving that choice unresolved.",
        evidence: "avoiding a hard decision about letting go of a product line I built first",
        focus: "Name the product line decision plainly and set a date to make it final.",
      },
      {
        key: "identityAlignment",
        narrative:
          "The strongest tension here is between founder identity and present reality. The first product line is not just an offering; it carries history, proof, and ownership. That is why this has weight beyond a normal portfolio decision. You keep starting initiatives you do not finish because motion lets you stay loyal to the past without openly choosing it. The misalignment is not between you and ambition. It is between who built the business first and who has to lead it now.",
        evidence: "I'm emotionally attached to it because I built it first",
        focus: "Separate what honors your history from what governs your next operating decisions.",
      },
      {
        key: "decisionReadiness",
        narrative:
          "You are more ready than your current pattern suggests. The clearest sign is Q4: \"I'd immediately close the door on hiring another expensive consultant... I don't need more information.\" That is a leader who knows analysis is no longer the bottleneck. Your readiness is being diluted by substitution: low-value tasks, new initiatives, and busy team activity standing in for one hard call. Readiness here means ending the loop, not gathering more proof.",
        evidence: "I don't need more information",
        focus: "Stop feeding the decision with side work and force it into one explicit choice.",
      },
      {
        key: "energyAlignment",
        narrative:
          "Your body is already keeping score. You described not sleeping well, getting short with your wife, burying yourself in low-value tasks, and feeling your chest get tight in the mornings. That is not abstract stress; it is sustained friction from carrying unresolved leadership pressure into daily life. Your picture of success is strikingly ordinary: no dread, one clear priority, three easy no's, leaving at 5 without guilt. That tells you exactly what kind of energy you are trying to recover: clean, simple, unbraced.",
        evidence: "My chest gets tight in the mornings",
        focus: "Use your morning body signal as a decision metric, not just a stress symptom.",
      },
    ],
    themes: [
      {
        title: "Attachment posing as caution",
        body: "You are not hesitating because the facts are weak. You are hesitating because the product line carries emotional meaning. Calling it caution has helped you keep it alive, but your own answers show the business and your body are both absorbing the cost.",
      },
      {
        title: "Busyness as cover",
        body: "The team feels busy. You bury yourself in tasks that feel productive but are not. Starting initiatives you do not finish has become a way to stay in motion without crossing the threshold of the real decision.",
      },
    ],
    beats: [
      {
        n: 1,
        title: "What This Cost",
        quote: "You are carrying a business that feels busy but not alive.",
        reflection:
          "This beat reveals that the burden is not just stalled growth, but the strain of being responsible for momentum that no longer feels real.",
      },
      {
        n: 2,
        title: "The Real Fight",
        quote: "There is something you know you may need to cut, and it is the first thing you built.",
        reflection: "This names the conflict cleanly: the business problem and the personal attachment are the same problem now.",
      },
      {
        n: 3,
        title: "Busy Isn't Honest",
        quote: "You keep starting things because finishing forces the real choice.",
        reflection: "This beat shows that your pattern is less about discipline and more about delaying finality.",
      },
      {
        n: 4,
        title: "Ordinary Tuesday",
        quote: "You know the one thing that matters, and you say no three times without guilt.",
        reflection: "What you want is not dramatic success; it is clean operating truth and a body that is no longer bracing.",
      },
      {
        n: 5,
        title: "No More Advice",
        quote: "You do not need more information. You need clean clarity on the hard decision.",
        reflection: "This brings the journey to its edge: the next gain comes from deciding, not learning.",
      },
    ],
    takeaways: [
      {
        title: "Write the cut memo",
        body: "Draft a one-page memo on the product line you may need to let go of: why it stays or goes, revenue reality, team cost, and what attachment has kept you from saying out loud. Do not share it yet; use it to remove vagueness.",
        urgency: "now",
      },
      {
        title: "Freeze new initiatives",
        body: "For the next two weeks, start nothing new unless it directly supports the product line decision or a current revenue driver. This will show how much motion has been substituting for choice.",
        urgency: "week",
      },
      {
        title: "Track false productivity",
        body: "At the end of each day for seven days, mark which tasks actually moved revenue, the team, or the product line decision. Circle the low-value work you used when pressure rose.",
        urgency: "week",
      },
      {
        title: "Reset one boundary home",
        body: "Pick one evening this week to leave by 5 and keep the office closed after that. You are testing whether guilt is being used to justify overextension that is no longer helping.",
        urgency: "month",
      },
    ],
    thirtyDay:
      "In 30 days, check three countable things: whether the product line decision has been made, how many new initiatives you started (target: zero unless tied to it), and how many mornings began with the decision work instead of email. If priorities are cleaner and your chest is quieter, you are removing the real drag.",
    scoreFraming:
      "Solid ground with one clear lever: the decision you already know how to make.",
    startHere:
      "Identity Alignment is your biggest lever: the decision feels heavy because it says who you are now, and everything else moves once it is made.",
    firstMove: {
      line: "Write the product line question at the top of Monday's page.",
      instruction:
        "Monday, before email: write the question at the top of the page, then work only on it for one bounded block. Done looks like one concrete step toward the decision, written down.",
    },
    dailyLine: "Motion is not the same as a decision.",
    shareableLine:
      "If you see me start something new this month, ask me if it serves the decision.",
    lockScreenLine: "Does this serve the decision?",
    evidenceLog: {
      instruction:
        "Add a row each time the urge to start something new appears instead of the decision work.",
      columns: ["Trigger moment", "Old sentence", "What I did", "Visible result"],
      seeded: {
        situation: "Sunday night, opening the laptop to plan the week",
        oldStory: "If revenue is flat, I have to do more of everything",
        whatIDid: "Wrote the product line question at the top, closed the plan",
        whatHappened: "Monday started on the decision, not the backlog",
      },
    },
    rhythm: [
      "Run the trigger protocol: each time the urge to start something new appears, note it and return to the product line question. Count the catches.",
      "Expect the dip. Midweek the flat-revenue pressure will argue for motion again. Use the recovery step: one bounded work block, nothing new.",
      "Read your Evidence Log back. Look for one pattern: what was true on the days the decision work actually happened?",
      "Check in with yourself against the three signs above. No score to retake, just your own evidence, read honestly.",
    ],
    openingPassage:
      "I built this company through recessions and pivots that would have ended most businesses. I know how to survive. What I am looking at now is different. The revenue is flat, and my first instinct is to move faster, to add one more initiative, to be everywhere at once. But the drag is not effort. It has never been effort. The question I keep stepping around is the product line. I already know enough to decide. This month I am not adding anything new. I am sitting with the one decision that changes the shape of everything else, and I am letting the noise be noise. Survival taught me to keep moving. This is me learning the other skill, the one where I stop, choose, and let the choice do the work that motion could not.",
    companions: {
      allyNote:
        "I want to tell you what I am working on this month, because you will see it before I do. When revenue gets tight, I start adding projects instead of deciding between them. It looks like energy. It is actually avoidance. For the next thirty days I am holding one question: the product line. If you see me spinning up something new, you can just ask me one thing: does this serve the decision? That is the whole favor. Nothing else changes.",
      pocketLine: "Motion is not the same as a decision.",
      patternVocabulary: [
        {
          phrase: "revenue is flat",
          meaning: "The trigger. What usually follows is a new initiative instead of the pending decision.",
        },
        {
          phrase: "I just need to push harder",
          meaning: "The old story arriving. Effort was never the missing piece; the decision is.",
        },
        {
          phrase: "once things settle down",
          meaning: "The deferral signal. Things settle after the decision, not before it.",
        },
      ],
    },
  },
  scoreSource: "llm",
}
