import type { ReactNode } from "react"
import { VerticalDevSwitcher } from "@/components/dev/vertical-dev-switcher"

/**
 * Locks every page under /challenge/* to the Marine palette by tagging the
 * subtree with `data-palette="marine"`. The token map in globals.css then
 * re-skins all editorial utilities (s-btn, s-card, hairline, etc.) without
 * any per-page styling. The landing page remains independent - its
 * PaletteProvider wraps only its own subtree.
 *
 * VerticalDevSwitcher renders ONLY when served from localhost (hostname
 * gate inside the component) - a QA affordance for jumping between
 * vertical content tracks; it produces nothing in deployed environments.
 */
export default function ChallengeLayout({ children }: { children: ReactNode }) {
  return (
    <div data-palette="marine" className="bg-background text-foreground min-h-screen font-sans">
      {children}
      <VerticalDevSwitcher />
    </div>
  )
}
