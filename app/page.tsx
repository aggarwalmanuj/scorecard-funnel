import { PaletteProvider } from "@/components/landing-minimal/palette-switcher"
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

export default function Home() {
  return (
    <PaletteProvider>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <MinimalHeader />
        <main>
          <MinimalHero />
          <SanctuarySection />
          <DimensionsSection />
          <TakeHomeSection />
          <VoicesSection />
          <CredentialsSection />
          <NotesSection />
          <ClosingSection />
        </main>
        <MinimalFooter />
      </div>
    </PaletteProvider>
  )
}
