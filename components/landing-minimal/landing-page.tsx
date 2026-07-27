import { MinimalHeader } from "@/components/landing-minimal/header"
import { MinimalHero } from "@/components/landing-minimal/hero"
import { ProductShowcaseSection } from "@/components/landing-minimal/product-showcase"
import { WalkthroughSection } from "@/components/landing-minimal/walkthrough"
import { SanctuarySection } from "@/components/landing-minimal/sanctuary"
import { EssenceSection } from "@/components/landing-minimal/essence"
import { FitSection } from "@/components/landing-minimal/fit"
import { TeamsSection } from "@/components/landing-minimal/teams"
import { TakeHomeSection } from "@/components/landing-minimal/take-home"
import { VoicesSection } from "@/components/landing-minimal/voices"
import { CredentialsSection } from "@/components/landing-minimal/credentials"
import { NotesSection } from "@/components/landing-minimal/notes"
import { ClosingSection } from "@/components/landing-minimal/closing"
import { MinimalFooter } from "@/components/landing-minimal/footer"
import { FunnelExitIntent } from "@/components/challenge/funnel-exit-intent"
import type { HeadlineVariant } from "@/lib/headline-shared"

/**
 * The full landing composition, shared by `/` (default headline) and the
 * `/hl/[id]` A/B variant pages (headline baked into the SSR HTML by the
 * server — no skeleton, no client-side swap).
 *
 * Locked to the Marine palette to match the rest of the funnel. The previous
 * PaletteProvider + floating switcher widget live in git history if a future
 * moodboard pass needs them again.
 */
export function LandingPage({ headline }: { headline?: HeadlineVariant }) {
  return (
    <div
      data-palette="marine"
      className="min-h-screen bg-background text-foreground font-sans"
    >
      {/* Same redesigned exit modal as the funnel - one system, one look.
          On the landing its started-stage CTA routes into the assessment. */}
      <FunnelExitIntent />
      <MinimalHeader />
      <main>
        <MinimalHero headline={headline} />
        {/* Block 01B (Doorway System): the artifact demonstrated immediately
            after the hero - what you physically get, shown, not described. */}
        <ProductShowcaseSection />
        <CredentialsSection />
        <WalkthroughSection />
        <EssenceSection />
        <TakeHomeSection />
        <VoicesSection />
        <SanctuarySection />
        <FitSection />
        <TeamsSection />
        <NotesSection />
        <ClosingSection />
      </main>
      <MinimalFooter />
    </div>
  )
}
