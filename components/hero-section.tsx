"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section className="relative min-h-[92vh] flex flex-col" id="hero">
      {/* Announcement Banner */}
      <div className="border-b-2 border-foreground/8 bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 py-3 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <span className="text-foreground font-bold tracking-wide uppercase text-xs">
              Your Unfair Advantage Score
            </span>
            <span className="hidden sm:inline text-foreground/20 font-bold">|</span>
            <span className="hidden sm:inline text-primary font-bold text-xs uppercase tracking-wide">
              Free · 10 minutes · Private
            </span>
          </div>
        </div>
      </div>

      {/* Hero Content */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Background - geometric wireframe shapes */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute top-20 right-[10%] w-64 h-64 border-2 border-primary/10 rounded-full" />
          <div className="absolute bottom-32 left-[5%] w-40 h-40 border-2 border-primary/8 rotate-45" />
          <div className="absolute top-1/3 left-1/4 w-3 h-3 bg-primary/20 rounded-full" />
          <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-primary/30 rounded-full" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left - Copy */}
            <div className={`${isVisible ? "animate-fade-in-left" : "opacity-0"}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full neu-border-primary bg-secondary text-primary text-sm font-extrabold mb-8">
                <Sparkles className="h-3.5 w-3.5 fill-current" />
                Mensa Research Journal · Peer-reviewed
              </div>

              {/* Headline - sized so "Your Unfair" stays one line at every breakpoint.
                  whitespace-nowrap pins it; font-size capped below the wrap point. */}
              <h1 className="font-black tracking-tighter text-foreground leading-[0.95] text-[44px] sm:text-[56px] md:text-[64px] lg:text-[60px] xl:text-[72px]">
                <span className="block whitespace-nowrap">Your Unfair</span>
                <span className="block">Advantage</span>
                <span className="inline-block mt-2 relative">
                  <span className="text-primary">Score.</span>
                  <svg
                    className="absolute -bottom-1 left-0 w-full"
                    viewBox="0 0 300 8"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M2 6C60 2 120 2 180 5C240 8 270 3 298 5"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="text-primary/50 animate-draw-line"
                    />
                  </svg>
                </span>
              </h1>

              <p className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">
                Discover what&apos;s quietly limiting your performance - and unlock what&apos;s
                been working against you.
              </p>

              {/* CTA - routes to the audience page where name + email are captured. */}
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="group h-14 px-7 text-base font-extrabold rounded-xl neu-border-primary neu-shadow-primary-sm neu-btn-press"
                >
                  <Link href="/challenge/audience">
                    Take My Score
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <Shield className="h-4 w-4 shrink-0 text-primary/60" />
                  Free to start. No credit card.
                </span>
              </div>

              {/* Social proof - counter without portrait stack (we don't have
                  real photos to use; numerals carry weight on their own). */}
              <div className="mt-10 inline-flex items-center gap-4 px-5 py-3 rounded-2xl border-2 border-foreground/10 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                <span className="flex -space-x-1.5" aria-hidden>
                  <Sparkles className="h-4 w-4 text-primary" />
                  <Sparkles className="h-4 w-4 text-primary/70" />
                  <Sparkles className="h-4 w-4 text-primary/40" />
                </span>
                <div className="text-sm">
                  <span className="font-black text-foreground">887</span>
                  <span className="text-muted-foreground font-medium">
                    {" "}
                    leaders found their score
                  </span>
                </div>
              </div>
            </div>

            {/* Right - Image */}
            <div
              className={`relative ${isVisible ? "animate-fade-in-right delay-200" : "opacity-0"}`}
            >
              <div className="relative rounded-2xl overflow-hidden neu-border neu-shadow-lg img-hover-zoom">
                <Image
                  src="/images/hero-leader.jpg"
                  alt="Executive at the crossroads of clarity"
                  width={600}
                  height={450}
                  className="w-full h-auto object-cover aspect-4/3"
                  priority
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
              </div>

              {/* Floating stat card */}
              <div className="absolute -bottom-5 -left-5 p-4 rounded-xl bg-card neu-border neu-shadow-sm hidden lg:block">
                <p className="text-3xl font-black text-primary leading-none">7</p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-1">
                  Dimensions
                </p>
              </div>

              <div className="absolute -top-3 -right-3 w-20 h-20 border-2 border-primary/20 rounded-xl -z-10 hidden lg:block" />
              <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-primary/10 -z-10 hidden lg:block" />
            </div>
          </div>
        </div>
      </div>

      {/* Floor strip */}
      <div className="border-t-2 border-foreground/8 bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] sm:text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" /> 10-min diagnostic
          </span>
          <span className="text-foreground/15">·</span>
          <span>Microsoft · IBM · T-Mobile · Pearson</span>
          <span className="text-foreground/15">·</span>
          <span>4 AI Patents</span>
          <span className="text-foreground/15">·</span>
          <span>$500M+ impact</span>
        </div>
      </div>
    </section>
  )
}
