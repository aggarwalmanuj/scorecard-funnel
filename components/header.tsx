"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X, ArrowRight } from "lucide-react"
import { useState } from "react"

const navLinks = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#deliverables", label: "What You Get" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#paths", label: "Paths" },
  { href: "#faq", label: "FAQ" },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b-2 border-foreground/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-18 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0 group">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Colored%20%28Transparent%29-i3BIGX38o1jOu8WEN9AsCy09XzplWy.png"
                alt="AIMerge"
                width={130}
                height={32}
                className="dark:hidden transition-transform duration-200 group-hover:scale-105"
                style={{ height: 32, width: 'auto' }}
                priority
                unoptimized
              />
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/White%20%28Transparent%29-ch7lxVfW4eNHZNaDbk70Bpfil2XuOt.png"
                alt="AIMerge"
                width={130}
                height={32}
                className="hidden dark:block transition-transform duration-200 group-hover:scale-105"
                style={{ height: 32, width: 'auto' }}
                priority
                unoptimized
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg group"
                >
                  {link.label}
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-primary rounded-full transition-all duration-300 group-hover:w-2/3" />
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <Button
                asChild
                className="hidden sm:inline-flex h-10 px-5 font-extrabold text-sm rounded-xl neu-border-primary neu-shadow-primary-sm neu-btn-press bg-primary text-primary-foreground"
              >
                <Link href="/challenge/audience">
                  Take My Score
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>

              {/* Mobile Menu Toggle */}
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden flex h-11 w-11 items-center justify-center rounded-xl border-2 border-foreground/15 hover:border-primary hover:neu-shadow-primary-xs transition-all duration-200"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-100 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-fade-in-up"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-0 bg-background border-b-2 border-foreground shadow-2xl animate-fade-in-up [animation-duration:0.3s]">
            <div className="flex items-center justify-between px-4 sm:px-6 h-16 sm:h-18 border-b-2 border-foreground/10">
              <Link href="/" className="flex items-center" onClick={() => setMobileOpen(false)}>
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Colored%20%28Transparent%29-i3BIGX38o1jOu8WEN9AsCy09XzplWy.png"
                  alt="Your Unfair Advantage"
                  width={130}
                  height={32}
                  className="dark:hidden"
                  style={{ height: 32, width: 'auto' }}
                  unoptimized
                />
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/White%20%28Transparent%29-ch7lxVfW4eNHZNaDbk70Bpfil2XuOt.png"
                  alt="Your Unfair Advantage"
                  width={130}
                  height={32}
                  className="hidden dark:block"
                  style={{ height: 32, width: 'auto' }}
                  unoptimized
                />
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-foreground/15 hover:border-primary transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="px-4 sm:px-6 py-6 space-y-1">
              {navLinks.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-4 py-4 text-lg font-extrabold text-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200 group"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {link.label}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
                </Link>
              ))}
            </nav>

            <div className="px-4 sm:px-6 pb-6">
              <Button
                asChild
                className="w-full h-14 text-base font-extrabold rounded-xl neu-border-primary neu-shadow-primary neu-btn-press"
              >
                <Link href="/challenge/audience" onClick={() => setMobileOpen(false)}>
                  Take My Score
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-4 font-medium">
                Free · 10 minutes · Private and secure.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
