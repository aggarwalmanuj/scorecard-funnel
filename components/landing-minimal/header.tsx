"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Menu, X } from "lucide-react"

const navLinks = [
  { href: "#sanctuary", label: "The Sanctuary" },
  { href: "#how-it-works", label: "The Reading" },
  { href: "#voices", label: "Voices" },
  { href: "#guides", label: "Guides" },
  { href: "#notes", label: "Notes" },
]

/**
 * Logo placeholder — kept as a small accessible link with no visual mark
 * for now. The user is composing a matching wordmark separately; this
 * preserves the home-link affordance and reserves the layout slot so the
 * header layout doesn't need rewriting when the logo arrives.
 */
function HomeMark({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="Home"
      className="group relative flex h-9 w-9 shrink-0 items-center justify-center"
    >
      <span className="brand-mark brand-mark-sm transition-transform duration-300 group-hover:scale-105" aria-hidden />
      <span className="sr-only">Home</span>
    </Link>
  )
}

export function MinimalHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const lastY = useRef(0)

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

  useEffect(() => {
    if (mobileOpen) setHidden(false)
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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-5 sm:h-20 sm:px-10 lg:px-16">
          <HomeMark />

          <nav className="hidden items-center gap-10 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative text-[0.78rem] uppercase tracking-[0.22em] text-foreground/80 transition-colors duration-300 hover:text-ink"
              >
                {link.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-ink transition-all duration-500 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
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
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors duration-300 hover:border-ink lg:hidden"
            >
              <Menu className="h-4.5 w-4.5" strokeWidth={1.3} />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-100 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-x-0 top-0 border-b border-border bg-background animate-fade-in-up animation-duration-[0.5s]">
            <div className="flex h-20 items-center justify-between border-b border-border px-6 sm:px-10">
              <HomeMark onClick={() => setMobileOpen(false)} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors duration-300 hover:border-ink"
              >
                <X className="h-4.5 w-4.5" strokeWidth={1.3} />
              </button>
            </div>

            <nav className="space-y-6 px-6 py-10 sm:px-10">
              {navLinks.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block font-serif text-3xl text-ink transition-opacity duration-300 hover:opacity-60"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="px-6 pb-10 sm:px-10">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false)
                  setTimeout(
                    () =>
                      document
                        .getElementById("begin")
                        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
                    300,
                  )
                }}
                className="s-btn w-full justify-center"
              >
                Begin the reading
              </button>
              <p className="mt-6 text-center text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">
                Ten minutes · No commitment
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
