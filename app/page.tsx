import { LandingPage } from "@/components/landing-minimal/landing-page"

/**
 * `/` serves the landing page. It used to be rewritten by middleware to an
 * assigned `/hl/[id]` headline-variant page; that A/B experiment was removed
 * on 2026-08-07 (it never ran a variant, and its assignment lookup put a
 * blocking same-origin fetch in front of every homepage render).
 */
export default function Home() {
  return <LandingPage />
}
