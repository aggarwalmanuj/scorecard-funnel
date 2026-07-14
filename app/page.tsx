import { LandingPage } from "@/components/landing-minimal/landing-page"

/**
 * `/` serves the DEFAULT headline as fully static HTML. When the headline
 * experiment is on (active variants exist), middleware rewrites this route
 * to the visitor's assigned `/hl/[id]` page before it ever renders — so
 * this page is only seen when the experiment is off.
 */
export default function Home() {
  return <LandingPage />
}
