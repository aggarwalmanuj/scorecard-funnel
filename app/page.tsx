import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { RootCauseSection } from "@/components/landing/root-cause-section"
import { SevenDimensionsSection } from "@/components/landing/seven-dimensions-section"
import { DeliverablesSection } from "@/components/landing/deliverables-section"
import { PatternStoriesSection } from "@/components/landing/pattern-stories-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { TrustedBySection } from "@/components/landing/trusted-by-section"
import { DualPathSection } from "@/components/landing/dual-path-section"
import { FaqSection } from "@/components/faq-section"
import { CtaBanner } from "@/components/cta-banner"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <RootCauseSection />
        <SevenDimensionsSection />
        <DeliverablesSection />
        <PatternStoriesSection />
        <TestimonialsSection />
        <TrustedBySection />
        <DualPathSection />
        <FaqSection />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  )
}
