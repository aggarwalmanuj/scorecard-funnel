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
    bandLabel: "Good readiness",
    bandMessage:
      "Clear about the situation, with some gaps in direction or alignment still to close.",
    benchmarkMean: 48,
    comparisonLabel:
      "Above average clarity readiness - one specific move unlocks significant movement.",
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
      "In 30 days, re-measure three things: whether the product line decision has been made, whether new initiatives have dropped, and whether your mornings feel less tight. If revenue is still flat but your priorities are cleaner and your chest is quieter, you are finally removing the real drag.",
  },
  scoreSource: "llm",
}
