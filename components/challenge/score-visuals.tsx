"use client"

import { useEffect, useState } from "react"
import { Compass, Fingerprint, Scale, Zap, type LucideIcon } from "lucide-react"
import type { PillarKey } from "@/lib/vertical-display"

/**
 * Shared score visualization primitives - the "assessment product" visual
 * language (animated score rings, per-dimension dials) used by the summary
 * score card, the processing screen, and the offer page preview.
 *
 * DIMENSION COLORS are a validated categorical palette: all six dataviz
 * checks (lightness band, chroma floor, CVD separation, normal-vision
 * floor, contrast) pass against the marine card surface #163a4d in the
 * display order below. Keep the ORDER and the ASSIGNMENT stable - color
 * follows the dimension, never its rank or value.
 */

export const DIMENSION_ORDER: PillarKey[] = [
  "directionClarity",
  "identityAlignment",
  "decisionReadiness",
  "energyAlignment",
]

export const DIMENSION_COLORS: Record<PillarKey, string> = {
  directionClarity: "#1a9cba", // teal (brand-adjacent)
  identityAlignment: "#d95926", // orange
  decisionReadiness: "#9085e9", // violet
  energyAlignment: "#c98500", // amber
}

/** Icon per dimension - secondary (non-color) identity encoding, so the
 *  dimensions stay tellable-apart in CVD/print contexts. */
export const DIMENSION_ICONS: Record<PillarKey, LucideIcon> = {
  directionClarity: Compass,
  identityAlignment: Fingerprint,
  decisionReadiness: Scale,
  energyAlignment: Zap,
}

/**
 * SVG donut ring, animated from 0 to `value` on mount. Center content is
 * passed as children (text wears text tokens, never the series color - the
 * ring carries the color, the number stays ink).
 */
export function ScoreRing({
  value,
  size = 120,
  stroke = 7,
  color,
  trackOpacity = 0.45,
  animate = true,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  color: string
  trackOpacity?: number
  animate?: boolean
  children?: React.ReactNode
}) {
  const v = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  // Mount at 0, transition to the real value on the next frame - pure CSS
  // stroke-dashoffset animation, no JS ticker.
  const [shown, setShown] = useState(animate ? 0 : v)
  useEffect(() => {
    if (!animate) {
      setShown(v)
      return
    }
    const raf = requestAnimationFrame(() => setShown(v))
    return () => cancelAnimationFrame(raf)
  }, [v, animate])

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${v} out of 100`}
    >
      <svg className="absolute inset-0 -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
          opacity={trackOpacity}
        />
        {/* No drop-shadow glow on the arc: at low values the blurred
            rounded cap reads as a floating blob ("comet smear") instead of
            a dial. A crisp arc on a clearly visible track stays legible at
            any value - the track carries the dial's shape. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          style={{
            transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>
      <div className="relative flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}

/**
 * One dimension as a dial card: colored ring + score, label + overline +
 * optional reason beneath. Direct-labeled (never color-alone identity).
 */
export function DimensionDial({
  dimension,
  label,
  pillar,
  value,
  reason,
}: {
  dimension: PillarKey
  label: string
  pillar: string
  value: number
  reason?: string
}) {
  const color = DIMENSION_COLORS[dimension]
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-background/40 p-4 sm:p-5">
      <div className="flex w-full items-center gap-4">
        <ScoreRing value={value} size={64} stroke={5} color={color}>
          <span className="font-serif text-[18px] leading-none tabular-nums text-ink">
            {value}
          </span>
        </ScoreRing>
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.22em] text-foreground/50">
            {pillar}
          </p>
          <p className="mt-0.5 font-serif text-[15.5px] leading-snug text-ink">
            {label}
          </p>
        </div>
      </div>
      {reason && (
        <p className="text-[13px] leading-[1.65] text-foreground/75">{reason}</p>
      )}
    </div>
  )
}
