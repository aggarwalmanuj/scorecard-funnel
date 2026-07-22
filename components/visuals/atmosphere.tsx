"use client"

import { DIMENSION_COLORS } from "@/components/challenge/score-visuals"

/**
 * The ambient graphic layer - aurora orbs in the dimension colors plus a
 * fading dot grid - mounted behind page content so no viewport is ever
 * flat text on a flat background. Pure decoration: pointer-events-none,
 * aria-hidden, low opacity so text contrast is never touched. Parent must
 * be `relative`; content above should be `relative` (or z-indexed).
 */
export function Atmosphere({
  className = "",
  intensity = 1,
}: {
  className?: string
  /** 1 = ambient. Raise toward 1.5 for hero/CTA "poster" moments. */
  intensity?: number
}) {
  const o = (base: number) => Math.min(0.2, base * intensity)
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      <div
        className="absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: DIMENSION_COLORS.directionClarity, opacity: o(0.09) }}
      />
      <div
        className="absolute -left-32 top-1/3 h-80 w-80 rounded-full blur-3xl"
        style={{ background: DIMENSION_COLORS.decisionReadiness, opacity: o(0.07) }}
      />
      <div
        className="absolute -bottom-20 right-1/4 h-72 w-72 rounded-full blur-3xl"
        style={{ background: DIMENSION_COLORS.energyAlignment, opacity: o(0.055) }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in srgb, var(--ink) 24%, transparent) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          opacity: 0.12 * intensity,
          maskImage:
            "radial-gradient(ellipse 90% 65% at 50% 0%, black 0%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 65% at 50% 0%, black 0%, transparent 78%)",
        }}
      />
    </div>
  )
}
