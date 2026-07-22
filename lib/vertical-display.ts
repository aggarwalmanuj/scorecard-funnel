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
}

export type PillarKey =
  | "directionClarity"
  | "identityAlignment"
  | "decisionReadiness"
  | "energyAlignment"

export interface VerticalDisplay {
  /** The free product's public name (One-Name Law: exactly one per vertical). */
  productName: string
  /** The paid report artifact's name - toolbar, cover, page footers, PDF. */
  reportName: string
  pillarLabels: Record<PillarKey, PillarLabel>
  /** Which offer page this vertical renders. */
  offerVariant: "b2c" | "b2b"
  /** Optional vertical-specific reassurance line on the B2C offer page
   *  (e.g. the ADHD anti-system line from the B2C conversion strategy). */
  offerAccent?: string
}

const B2C_PILLARS: Record<PillarKey, PillarLabel> = {
  directionClarity: { label: "Direction Clarity", pillar: "Pillar I · Purpose" },
  identityAlignment: { label: "Identity Alignment", pillar: "Pillar II · Identity" },
  decisionReadiness: { label: "Decision Readiness", pillar: "Pillar III · Peace of Mind" },
  energyAlignment: { label: "Energy Alignment", pillar: "Pillar IV · Embodiment" },
}

export const VERTICAL_DISPLAY: Record<Vertical, VerticalDisplay> = {
  main: {
    productName: "Belief Score",
    reportName: "Personalized 30-Day Action Plan",
    pillarLabels: B2C_PILLARS,
    offerVariant: "b2c",
  },
  // Retargeting re-enters the SAME product (recovery-system doc: never a
  // variant, never a retake) - identical display to main.
  retargeting: {
    productName: "Belief Score",
    reportName: "Personalized 30-Day Action Plan",
    pillarLabels: B2C_PILLARS,
    offerVariant: "b2c",
  },
  adhd: {
    productName: "ADHD Belief Score",
    reportName: "Personalized 30-Day Action Plan",
    // Matches the ADHD score rubric: dimension 1 scores how clearly the
    // PATTERN is seen; dimension 2 scores the distance between the pattern
    // and the self ("something that happens" vs "something I am").
    pillarLabels: {
      directionClarity: { label: "Pattern Clarity", pillar: "Pillar I · The Pattern" },
      identityAlignment: { label: "Identity Distance", pillar: "Pillar II · Identity" },
      decisionReadiness: { label: "Decision Readiness", pillar: "Pillar III · Peace of Mind" },
      energyAlignment: { label: "Energy Alignment", pillar: "Pillar IV · Embodiment" },
    },
    offerVariant: "b2c",
    // Speaks directly to the graveyard of abandoned planners (Fear 4, the
    // dominant purchase fear for this vertical per the B2C strategy).
    offerAccent:
      "No new system to maintain, no daily hour, no streak to break.",
  },
  healthcare: {
    productName: "Belief Profile",
    reportName: "Healthcare Operations Action Plan",
    // Operational register (B2B strategy: no psychology vocabulary anywhere
    // in written B2B assets) - same keys, org-level meanings, mirroring the
    // healthcare score prompt's rubric.
    pillarLabels: {
      directionClarity: { label: "Pattern Precision", pillar: "Dimension I · The Loop" },
      identityAlignment: { label: "Ownership Clarity", pillar: "Dimension II · Ownership" },
      decisionReadiness: { label: "Test Readiness", pillar: "Dimension III · Evidence" },
      energyAlignment: { label: "Capacity Realism", pillar: "Dimension IV · Capacity" },
    },
    offerVariant: "b2b",
  },
}

export function displayFor(vertical: Vertical | null | undefined): VerticalDisplay {
  return VERTICAL_DISPLAY[vertical ?? "main"] ?? VERTICAL_DISPLAY.main
}
