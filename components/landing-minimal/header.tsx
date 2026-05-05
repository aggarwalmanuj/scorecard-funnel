"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Menu, X, ArrowUpRight } from "lucide-react"

const navLinks = [
  { href: "#sanctuary", label: "The Sanctuary" },
  { href: "#how-it-works", label: "The Reading" },
  { href: "#voices", label: "Voices" },
  { href: "#guides", label: "Guides" },
  { href: "#notes", label: "Notes" },
]

export function MinimalHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const lastY = useRef(0)

  // Auto-hide on scroll-down (mobile only — desktop overrides), reveal on
  // scroll-up. Header is always visible near the top of the page.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      if (y < 64) setHidden(false)
      else if (y > lastY.current + 6) setHidden(true)
      else if (y < lastY.current - 6) setHidden(false)
      lastY.current = y
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Lock body scroll while the mobile sheet is open + always reveal the
  // header so the close button stays reachable.
  useEffect(() => {
    if (mobileOpen) {
      setHidden(false)
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [mobileOpen])

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-[transform,background-color,border-color,backdrop-filter] duration-500 ease-out ${
          hidden ? "-translate-y-full lg:translate-y-0" : "translate-y-0"
        } ${
          scrolled
            ? "bg-background/85 backdrop-blur-xl border-b border-border"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-5 sm:h-20 sm:gap-4 sm:px-10 lg:px-16">
          {/* Logo — sized at the wordmark's true 7.12:1 aspect so neither
              the "AI" prefix nor the "MERGE" tail clip on small screens.
              Mobile uses brand-mark-sm (110px), desktop bumps to default
              (140px). Hover lift is wired in globals.css. */}
          <Link
            href="/"
            aria-label="AIMerge home"
            className="group inline-flex shrink-0 items-center"
          >
            <span className="brand-mark brand-mark-sm sm:!w-[140px]" aria-hidden />
          </Link>

          {/* Desktop nav — animated underline draw on hover. */}
          <nav className="hidden items-center gap-9 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group/nav relative text-[0.78rem] uppercase tracking-[0.22em] text-foreground/80 transition-colors duration-300 hover:text-ink"
              >
                {link.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-ink transition-all duration-500 group-hover/nav:w-full" />
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("begin")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className="s-btn hidden text-[0.7rem] lg:inline-flex"
            >
              Begin the reading
            </button>

            {/* Hamburger — animated to morph into an X when opened. The
                three lines tween via individual transforms on the spans. */}
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
              className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-foreground/30 text-foreground transition-all duration-300 hover:scale-105 hover:border-ink hover:text-ink active:scale-95 lg:hidden"
            >
              <span className="sr-only">
                {mobileOpen ? "Close menu" : "Open menu"}
              </span>
              <span
                className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                  mobileOpen
                    ? "rotate-90 opacity-0"
                    : "rotate-0 opacity-100"
                }`}
              >
                <Menu className="h-4.5 w-4.5" strokeWidth={1.4} />
              </span>
              <span
                className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                  mobileOpen
                    ? "rotate-0 opacity-100"
                    : "-rotate-90 opacity-0"
                }`}
              >
                <X className="h-4.5 w-4.5" strokeWidth={1.4} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sheet — full-screen serif menu with stagger reveal. The
          Marine palette stays on this subtree (it inherits from the page
          wrapper, but we re-declare data-palette so the sheet doesn't
          go off-brand if a parent ever lifts the wrapper). */}
      {mobileOpen && (
        <div
          data-palette="marine"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-md transition-opacity duration-500 animate-fade-in-up animation-duration-[0.4s]"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div
            className="absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col border-b border-border bg-background animate-fade-in-up animation-duration-[0.45s]"
            style={{ paddingTop: "64px" }}
          >
            <nav
              className="flex flex-col gap-1 overflow-y-auto px-5 py-8 sm:px-8"
              aria-label="Mobile navigation"
            >
              {navLinks.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="group flex items-center justify-between rounded-md px-4 py-4 font-serif text-[26px] leading-tight text-ink transition-colors duration-300 hover:bg-secondary/60 animate-stagger-in"
                  style={{ animationDelay: `${i * 60 + 100}ms` }}
                >
                  <span>{link.label}</span>
                  <ArrowUpRight
                    className="h-4 w-4 text-foreground/55 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
                    strokeWidth={1.6}
                  />
                </Link>
              ))}
            </nav>
            <div className="border-t border-border px-5 pb-7 pt-5 sm:px-8">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false)
                  setTimeout(
                    () =>
                      document
                        .getElementById("begin")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        }),
                    280,
                  )
                }}
                className="s-btn w-full justify-center"
              >
                Begin the reading
              </button>
              <p className="mt-4 text-center text-[10px] uppercase tracking-[0.22em] text-foreground/55">
                Ten minutes · No commitment
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
