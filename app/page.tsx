import { MinimalHeader } from "@/components/landing-minimal/header"
import { MinimalHero } from "@/components/landing-minimal/hero"
import { SanctuarySection } from "@/components/landing-minimal/sanctuary"
import { DimensionsSection } from "@/components/landing-minimal/dimensions"
import { TakeHomeSection } from "@/components/landing-minimal/take-home"
import { VoicesSection } from "@/components/landing-minimal/voices"
import { CredentialsSection } from "@/components/landing-minimal/credentials"
import { NotesSection } from "@/components/landing-minimal/notes"
import { ClosingSection } from "@/components/landing-minimal/closing"
import { MinimalFooter } from "@/components/landing-minimal/footer"

/**
 * Landing page is locked to the Marine palette to match the rest of the
 * funnel. The previous PaletteProvider + floating switcher widget have
 * been removed now that the brand has settled on a single mood - they
 * live in git history if a future moodboard pass needs them again.
 */
export default function Home() {
  return (
    <div
      data-palette="marine"
      className="min-h-screen bg-background text-foreground font-sans"
    >
      <MinimalHeader />
      <main>
        <MinimalHero />
        <CredentialsSection />
        <TakeHomeSection />
        <VoicesSection />
        <SanctuarySection />
        <DimensionsSection />
        <NotesSection />
        <ClosingSection />
      </main>
      <MinimalFooter />
    </div>
  )
}
