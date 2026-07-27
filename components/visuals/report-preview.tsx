"use client"

import { Lock } from "lucide-react"
import type { Audience } from "@/context/challenge-context"
import { displayFor, type PillarKey } from "@/lib/vertical-display"
import {
  DIMENSION_COLORS,
  DIMENSION_ICONS,
  DIMENSION_ORDER,
  ScoreRing,
} from "@/components/challenge/score-visuals"

/**
 * A stylized page-one of the report artifact - the product made visible.
 * Renders inside a MacWindow on the landing (illustrative sample values)
 * and on the offer page (the user's REAL dimension scores). Narrative
 * content is deliberately abstracted into "redaction" bars: honest about
 * being personalized (you can't preview words that don't exist yet) while
 * showing the exact shape of what arrives.
 *
 * Per the proof-adjacency law: when values are illustrative, the caller
 * MUST caption it as such right below the frame.
 */

export const SAMPLE_SUBSCORES: Record<PillarKey, number> = {
  directionClarity: 68,
  identityAlignment: 47,
  decisionReadiness: 61,
  energyAlignment: 54,
}

export function overallOf(s: Record<PillarKey, number>): number {
  // Same weighting as lib/scoring.ts - keep the preview arithmetic honest.
  return Math.round(
    s.directionClarity * 0.35 +
      s.identityAlignment * 0.25 +
      s.decisionReadiness * 0.25 +
      s.energyAlignment * 0.15,
  )
}

export function ReportPreviewCard({
  vertical,
  subscores = SAMPLE_SUBSCORES,
  overall: overallProp,
  locked = false,
  animate = false,
}: {
  vertical: Audience
  /** Sample values for illustrative previews. Ignored when `locked`. */
  subscores?: Record<PillarKey, number>
  /** Explicit overall (e.g. the user's REAL overall in locked mode). */
  overall?: number
  /** Paid-content gate: dimension readings render as sealed rows - no
   *  numbers, no proportional bars - per policy that only the overall
   *  score is visible before purchase. */
  locked?: boolean
  animate?: boolean
}) {
  const display = displayFor(vertical)
  const overall = overallProp ?? overallOf(subscores)

  return (
    <div className="bg-card p-5 sm:p-6">
      {/* Document header */}
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
        <span className="flex items-center gap-2.5">
          <span className="brand-mark brand-mark-sm" aria-hidden />
          <span className="text-[9px] uppercase tracking-[0.2em] text-foreground/60">
            {display.reportName}
          </span>
        </span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-foreground/40">
          Page 1 of 6
        </span>
      </div>

      {/* Score hero row */}
      <div className="flex items-center gap-5">
        <ScoreRing value={overall} size={84} stroke={7} color="var(--signal)" animate={animate}>
          <span className="font-serif text-[24px] leading-none tabular-nums text-ink">
            {overall}
          </span>
        </ScoreRing>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/50">
            {display.productName}
          </p>
          {/* Abstracted headline - two ink bars standing in for the
              personalized thesis sentence */}
          <div className="mt-2 space-y-1.5" aria-hidden>
            <div className="h-2 w-11/12 rounded-full bg-ink/25" />
            <div className="h-2 w-7/12 rounded-full bg-ink/15" />
          </div>
        </div>
      </div>

      {/* Four dimensions. Locked mode: the rows exist (structure sells),
          but bars are uniform sealed strips and the value cell is a lock -
          nothing on screen implies any dimension's actual magnitude. */}
      <div className="mt-5 space-y-2.5">
        {DIMENSION_ORDER.map((k) => {
          const Icon = DIMENSION_ICONS[k]
          const color = DIMENSION_COLORS[k]
          const v = subscores[k]
          return (
            <div key={k} className="flex items-center gap-2.5">
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
              >
                <Icon className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
              </span>
              <span className="w-24 truncate text-[9.5px] uppercase tracking-[0.12em] text-foreground/60 sm:w-28">
                {display.pillarLabels[k].label}
              </span>
              {locked ? (
                <>
                  <span
                    className="relative h-1.5 flex-1 overflow-hidden rounded-full border border-dashed"
                    style={{
                      borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
                      background: `color-mix(in srgb, ${color} 8%, transparent)`,
                    }}
                    aria-label="Reading locked"
                  />
                  <span className="flex w-6 justify-end text-foreground/45">
                    <Lock className="h-3 w-3" strokeWidth={1.7} aria-hidden />
                  </span>
                </>
              ) : (
                <>
                  <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${v}%`, background: color }}
                    />
                  </span>
                  <span className="w-6 text-right font-serif text-[11px] tabular-nums text-ink">
                    {v}
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Abstracted narrative - the personalized prose that can't exist
          until they write their answers */}
      <div className="mt-5 space-y-1.5 border-t border-border pt-4" aria-hidden>
        <div className="h-1.5 w-full rounded-full bg-foreground/10" />
        <div className="h-1.5 w-10/12 rounded-full bg-foreground/10" />
        <div className="h-1.5 w-11/12 rounded-full bg-foreground/[0.07]" />
        <div className="h-1.5 w-5/12 rounded-full bg-foreground/[0.07]" />
      </div>

      <p className="mt-4 text-[9px] uppercase tracking-[0.16em] text-foreground/40">
        Built from your own words
      </p>
    </div>
  )
}
