"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Clock, BadgeCheck } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export function CtaBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-24 md:py-32 lg:py-40 relative overflow-hidden bg-secondary/30"
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/15" />
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/15" />

      <div
        className="absolute top-10 right-[10%] w-48 h-48 border-2 border-primary/8 rounded-full"
        aria-hidden
      />
      <div
        className="absolute bottom-10 left-[5%] w-32 h-32 border-2 border-primary/6 rotate-12"
        aria-hidden
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div
          className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
        >
          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden neu-border neu-shadow-lg img-hover-zoom order-2 lg:order-1">
            <Image
              src="/images/landscape-golden.jpg"
              alt="A golden landscape opening at first light — preview of the AIMerge clarity diagnostic report unlocked after a leader completes the five-question assessment."
              width={600}
              height={450}
              className="w-full h-auto object-cover aspect-4/3"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-6 sm:right-6">
              <p className="text-white text-sm sm:text-base font-black drop-shadow-md">
                The full diagnostic report unlocks after your assessment.
              </p>
            </div>
          </div>

          {/* Copy + CTA */}
          <div className="order-1 lg:order-2">
            <span className="inline-block px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-primary bg-secondary neu-border-primary mb-6">
              Ready to find it?
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-[1.02]">
              Find your
              <span className="block text-primary mt-2">unfair advantage.</span>
            </h2>

            <p className="mt-6 sm:mt-8 text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Free to start. 10 minutes. No credit card required.
            </p>

            {/* Primary CTA → audience page */}
            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4">
              <Button
                asChild
                size="lg"
                className="group h-14 px-7 text-base font-extrabold rounded-xl neu-border-primary neu-shadow-primary-sm neu-btn-press"
              >
                <Link href="/challenge/audience">
                  Find My Score
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>

            {/* Trust strip */}
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground font-medium">
              <li className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary/70" />
                Private and secure
              </li>
              <li className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary/70" />
                10 minutes
              </li>
              <li className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary/70" />
                Mensa Research Journal
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
