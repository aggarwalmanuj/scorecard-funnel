"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowLeft, Check, Shield, Calendar, FileText, Mail, Download, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChallenge, type Audience } from "@/context/challenge-context"
import { ChallengeNavHome } from "@/components/challenge/challenge-nav-home"
import {
  ChallengeMenuButton,
} from "@/components/challenge/challenge-funnel-header-actions"

export function OfferScreen({ audience }: { audience: Audience }) {
  const { state, markComplete } = useChallenge()
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCalendly, setShowCalendly] = useState(false)
  const [calendlyUrl, setCalendlyUrl] = useState("")

  // Bug fix #2: the previous implementation used IntersectionObserver to toggle
  // `opacity-0` on each section. Sections below the fold rendered with full
  // height but no content — producing what users reported as "3 screen heights
  // of blank space" between the hero and the offer. Sections now render
  // immediately; entrance animation is handled by CSS alone.

  /* ── Fetch Calendly scheduling URL from our API (reads CALENDLY_URL env var server-side) ── */
  useEffect(() => {
    fetch("/api/calendly/event-types")
      .then((r) => {
        if (!r.ok) {
          console.error("[calendly] fetch failed:", r.status, r.statusText)
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (!data) return
        if (data?.schedulingUrl) {
          setCalendlyUrl(data.schedulingUrl)
        } else {
          console.warn("[calendly] No scheduling URL in response:", data)
        }
      })
      .catch((err) => console.error("[calendly] fetch error:", err))
  }, [])

  /* ── Load Calendly widget script once ── */
  useEffect(() => {
    if (document.querySelector('script[src*="calendly.com/assets/external/widget"]')) return
    const script = document.createElement("script")
    script.src = "https://assets.calendly.com/assets/external/widget.js"
    script.async = true
    document.head.appendChild(script)
  }, [])

  /* ── Open Calendly popup or inline embed ── */
  const handleBookSession = useCallback(() => {
    if (!calendlyUrl) {
      alert("Calendly is not configured. Set CALENDLY_URL in your environment.")
      return
    }

    // Prefill name and email from challenge state
    const prefill: Record<string, string> = {}
    if (state.firstName) prefill.name = state.firstName
    if (state.email) prefill.email = state.email

    // Try the Calendly popup widget first
    if (typeof window !== "undefined" && (window as unknown as { Calendly?: { initPopupWidget: (opts: { url: string; prefill: Record<string, string>; utm: Record<string, string> }) => void } }).Calendly) {
      ;(window as unknown as { Calendly: { initPopupWidget: (opts: { url: string; prefill: Record<string, string>; utm: Record<string, string> }) => void } }).Calendly.initPopupWidget({
        url: calendlyUrl,
        prefill,
        utm: { utmSource: "ai-merge-challenge", utmMedium: "offer-page" },
      })
      markComplete()
      return
    }

    // Fallback: show inline embed
    setShowCalendly(true)
    markComplete()
  }, [calendlyUrl, state.firstName, state.email, markComplete])

  const handlePurchase = async () => {
    setIsProcessing(true)
    handleBookSession()
    await new Promise((resolve) => setTimeout(resolve, 600))
    setIsProcessing(false)
  }

  const includedItems = [
    { icon: FileText, text: "Complete review of your challenge output before we meet" },
    { icon: Calendar, text: "60 minutes of focused, structured decision work" },
    { icon: Check, text: "The one decision — named, framed, and ready to move" },
    { icon: FileText, text: "A written summary of what surfaced and what to do next" },
    { icon: Mail, text: "One follow-up email within 7 days to check what moved" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Calendly widget CSS */}
      <link
        href="https://assets.calendly.com/assets/external/widget.css"
        rel="stylesheet"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b-2 border-foreground/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="flex h-16 items-center justify-between">
            <ChallengeMenuButton />
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Colored%20%28Transparent%29-i3BIGX38o1jOu8WEN9AsCy09XzplWy.png"
              alt="AIMerge"
              width={120}
              height={32}
              className="h-7 w-auto shrink-0 dark:hidden"
              unoptimized
            />
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/White%20%28Transparent%29-ch7lxVfW4eNHZNaDbk70Bpfil2XuOt.png"
              alt="AIMerge"
              width={120}
              height={32}
              className="h-7 w-auto shrink-0 hidden dark:block"
              unoptimized
            />
            <ChallengeNavHome />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 sm:px-8 pt-6 md:pt-10 pb-6">
        {/* Task 17: "Review your results" back link — safe way back to Beat 5 */}
        <div className="max-w-xl mx-auto mb-5">
          <Link
            href={`/challenge/${audience}/beat-5`}
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Review your results
          </Link>
        </div>
        <div className="max-w-xl mx-auto animate-fade-in-up">
          {/* Hero — real photo of Manuj (closes the trust gap before asking for $297). */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-8 neu-border neu-shadow-md group">
            <Image
              src="/manuj/1762108515290.jpg"
              alt="Manuj Aggarwal speaking"
              fill
              className="object-cover object-[65%_center] transition-transform duration-700 group-hover:scale-[1.03]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          {/* Eyebrow — badge reworded until the report/scorecard is linked (bug 5) */}
          <p className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-primary bg-secondary neu-border-primary mb-4 flex items-center gap-2 animate-fade-in-left">
            <span className="w-6 h-px bg-primary/40" />
            YOUR INSIGHT IS COMPLETE
          </p>

          {/* Headline */}
          <h1 className="font-black tracking-tighter text-[28px] sm:text-[32px] text-foreground leading-tight mb-6 animate-fade-in-up">
            {state.firstName ? `${state.firstName}, the` : "The"} noise has been louder than the signal.
            <br /><br />
            <span className="relative inline-block">
              That changes now.
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-primary/50 rounded-full" />
            </span>
          </h1>

          {/* Bridge */}
          <div className="text-muted-foreground font-sans text-base leading-[1.75] space-y-4 mb-8 animate-fade-in-up">
            <p>
              What you shared in this challenge revealed something most leaders at your level never see clearly — the structural pattern underneath the surface problem.
            </p>
            <p>
              The question is no longer whether to move.<br />
              The question is whether you want to move it alone — or with someone who has already read your file.
            </p>
          </div>

          {/* Downloadable detailed report */}
          <div className="relative rounded-2xl p-5 sm:p-6 mb-2 neu-border neu-shadow-md bg-secondary/40 animate-fade-in-up">
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/15 shrink-0 mt-0.5">
                <FileDown className="w-5 h-5 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-primary mb-1">
                  Your detailed report
                </p>
                <h3 className="font-black tracking-tight text-foreground text-[18px] sm:text-[20px] leading-tight mb-1.5">
                  Download your Clarity Readiness Report
                </h3>
                <p className="text-muted-foreground font-sans text-[14px] leading-[1.6] mb-4">
                  A 4-page personalized PDF — your scores across four pillars, the threads we pulled from your answers, and the specific moves we&apos;d suggest. Yours to keep.
                </p>
                <a
                  href="/challenge/report?autosave=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-[14px] neu-border-primary neu-btn-press transition-all duration-300 hover:bg-primary/90"
                >
                  <Download className="w-4 h-4" />
                  Download report
                </a>
                <p className="text-[11px] text-muted-foreground/80 mt-2.5 flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  PDF will save to your downloads folder.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient bridge — trimmed to kill the whitespace gap (bug 2) */}
      <div className="h-6 sm:h-8 bg-gradient-to-b from-background to-[#0a0718]" />

      {/* The Offer */}
      <section className="bg-[#0a0718] px-6 sm:px-8 py-10 md:py-14">
        <div className="max-w-xl mx-auto">
          {/* Offer Badge */}
          <div className="inline-block bg-[#8b7cf6] text-white text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-full mb-6 neu-shadow-primary-xs animate-fade-in-left">
            One Option to Go Deeper
          </div>

          <h2 className="font-black tracking-tighter text-[24px] sm:text-[28px] text-white leading-[1.3] mb-6 animate-fade-in-up">
            The Honest Decision Session
          </h2>

          <div className="text-white/80 font-sans text-base leading-[1.75] space-y-4 mb-8 animate-fade-in-up">
            <p>
              A 60-minute private session designed to move what the challenge surfaced.
            </p>
            <p>
              Not coaching. Not consulting. A structured decision session with someone who has already read your responses — and can see what you might still be missing.
            </p>
          </div>

          {/* What's Included - Card-style list */}
          <div className="space-y-3 mb-8">
            {includedItems.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white/5 border border-white/8 transition-all duration-300 hover:border-[#8b7cf6]/30 hover:bg-white/[0.07] flex items-start gap-3 group animate-fade-in-left"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#8b7cf6]/15 shrink-0 mt-0.5 transition-all duration-300 group-hover:bg-[#8b7cf6]/25 group-hover:scale-110">
                    <Icon className="w-4 h-4 text-[#8b7cf6]" />
                  </span>
                  <span className="font-sans text-base text-white/90">{item.text}</span>
                </div>
              )
            })}
          </div>

          {/* Price Card - Neubrutalist dark */}
          <div className="relative rounded-2xl p-7 mb-6 neu-card-dark animate-curtain-rise">
            <div className="absolute -top-3 right-6 bg-[#8b7cf6] text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full neu-shadow-primary-xs">
              Most Popular
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-black tracking-tighter text-[48px] sm:text-[56px] text-white">$297</span>
              <span className="font-sans text-white/50 text-sm">one-time</span>
            </div>
            <div className="h-0.5 w-16 bg-[#8b7cf6]/40 rounded-full mb-3" />
            <p className="text-white/50 font-sans text-sm">
              Limited availability. Sessions booked within 14 days of completing the challenge.
            </p>
          </div>

          {/* Guarantee — surfaces the Beat 5 language at the point of decision (bug 4) */}
          <div className="mb-8 flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] border border-[#8b7cf6]/25">
            <Shield className="w-5 h-5 text-[#8b7cf6] shrink-0 mt-0.5" />
            <p className="font-sans text-[14px] leading-[1.6] text-white/85">
              <span className="font-black text-white">If you don&apos;t leave with a clear next move — you don&apos;t pay.</span>
              <span className="text-white/70"> Full stop.</span>
            </p>
          </div>

          {/* CTA Button with glow */}
          <div className="relative">
            <div className="absolute -inset-2 bg-[#8b7cf6]/15 rounded-2xl blur-xl animate-glow-pulse" />
            <Button
              onClick={handlePurchase}
              disabled={isProcessing}
              className="relative group w-full h-16 bg-[#8b7cf6] hover:bg-[#8b7cf6]/80 text-white font-black text-lg rounded-xl neu-border-primary neu-shadow-primary-lg neu-btn-press animate-attention-pulse transition-all duration-300"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                  Opening scheduler...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Book Your Session
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-white/45 text-[13px] text-center mt-4">
            <Shield className="w-3.5 h-3.5" />
            Choose your time — 60-minute session.
          </p>

          {/* Trust signals - Card grid */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: Calendar, text: "60-min session" },
              { icon: FileText, text: "Written summary" },
              { icon: Mail, text: "7-day follow-up" },
            ].map((t) => (
              <div key={t.text} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/8 transition-all duration-300 hover:border-[#8b7cf6]/20">
                <t.icon className="w-5 h-5 text-[#8b7cf6]" />
                <span className="text-[12px] font-medium text-white/50 text-center">{t.text}</span>
              </div>
            ))}
          </div>

          {/* Inline Calendly fallback embed (shown if popup fails) */}
          {showCalendly && calendlyUrl && (
            <div className="mt-8 rounded-2xl overflow-hidden border border-white/10">
              <iframe
                src={`${calendlyUrl}?hide_gdpr_banner=1&background_color=0a0718&text_color=ffffff&primary_color=8b7cf6${state.firstName ? `&name=${encodeURIComponent(state.firstName)}` : ""}${state.email ? `&email=${encodeURIComponent(state.email)}` : ""}`}
                width="100%"
                height="700"
                frameBorder="0"
                title="Schedule your Honest Decision Session"
                className="w-full"
              />
            </div>
          )}
        </div>
      </section>

      {/* Exit section — "NO PRESSURE" badge removed; the copy speaks for itself (bug 8) */}
      <section className="bg-background px-6 sm:px-8 py-14">
        <div className="max-w-xl mx-auto">
          <h3 className="font-black tracking-tighter text-[22px] sm:text-[24px] text-foreground leading-[1.3] mb-4 animate-fade-in-left">
            If now is not the right time —
          </h3>

          <div className="text-muted-foreground font-sans text-base leading-[1.75] space-y-4 mb-6 animate-fade-in-up">
            <p>
              Your challenge output is yours regardless.
            </p>
            <p>
              What surfaced is not going anywhere. The pattern you saw is now visible — and that visibility alone changes how you move.
            </p>
            <p>
              If you want to come back later, the option will be here.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center text-sm text-primary font-medium group neu-btn-press animate-fade-in-left"
          >
            Return to the beginning
            <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0718] px-6 sm:px-8 py-10 border-t border-white/6">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-3">
          <p className="text-white/30 text-[11px] tracking-wide">
            TetraNoodle Technologies
          </p>
        </div>
      </footer>
    </div>
  )
}
