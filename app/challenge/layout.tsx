import type { ReactNode } from "react"

/**
 * Locks every page under /challenge/* to the Marine palette by tagging the
 * subtree with `data-palette="marine"`. The token map in globals.css then
 * re-skins all editorial utilities (s-btn, s-card, hairline, etc.) without
 * any per-page styling. The landing page remains independent - its
 * PaletteProvider wraps only its own subtree.
 */
export default function ChallengeLayout({ children }: { children: ReactNode }) {
  return (
    <div data-palette="marine" className="bg-background text-foreground min-h-screen font-sans">
      {children}
    </div>
  )
}
