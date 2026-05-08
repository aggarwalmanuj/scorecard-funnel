"use client"

import Link from "next/link"
import { Menu, ArrowUpRight } from "lucide-react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type Variant = "light" | "dark"

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/#sanctuary", label: "The Sanctuary" },
  { href: "/#how-it-works", label: "The Reading" },
  { href: "/#voices", label: "Voices" },
  { href: "/#notes", label: "Notes" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
]

/**
 * Editorial menu trigger - small circular outline button consistent with
 * the rest of the Marine-locked challenge UI. The Sheet panel itself
 * renders via Radix portal at <body>, which sits OUTSIDE the page-level
 * `data-palette="marine"` wrapper, so we re-scope the palette inside the
 * SheetContent. Without that, the panel would inherit `:root` defaults
 * (warm cream/indigo) and read as a different brand.
 */
export function ChallengeMenuButton({
  variant = "light",
  className,
}: {
  variant?: Variant
  className?: string
}) {
  const _isDark = variant === "dark"
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground/85 transition-colors duration-300 hover:border-ink hover:text-ink",
            className,
          )}
        >
          <Menu className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(100%,340px)] border-r border-border bg-background p-0 sm:max-w-sm"
      >
        {/* Re-scope palette so the Sheet (rendered via portal) picks up
            the same Marine tokens as the rest of the funnel. */}
        <div data-palette="marine" className="flex h-full flex-col bg-background font-sans">
          <SheetHeader className="border-b border-border px-6 py-6 text-left">
            <div className="flex items-center gap-3">
              <span className="brand-mark brand-mark-sm" aria-hidden />
              <SheetTitle asChild>
                <span className="font-serif text-[18px] leading-none text-ink">
                  Menu
                </span>
              </SheetTitle>
            </div>
            <p className="font-serif-italic text-[14px] leading-snug text-foreground/75">
              Navigate the reading.
            </p>
          </SheetHeader>

          <nav className="flex flex-1 flex-col px-2 py-4" aria-label="Site">
            {NAV_LINKS.map((link) => (
              <SheetClose asChild key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  className="group flex items-center justify-between rounded-md px-4 py-3.5 font-serif text-[18px] text-ink transition-colors duration-300 hover:bg-secondary/60"
                >
                  <span>{link.label}</span>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-foreground/55 transition-all duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink"
                    strokeWidth={1.6}
                  />
                </Link>
              </SheetClose>
            ))}
          </nav>

          <div className="border-t border-border px-6 py-5">
            <p className="font-serif-italic text-[13px] leading-snug text-foreground/65">
              Composed quietly. Read at your own pace.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
