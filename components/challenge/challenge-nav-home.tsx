"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Variant = "light" | "dark"

/**
 * Routes where clicking "Back to home" mid-flow should show an exit-intent
 * confirmation. The challenge experience is stateful and users who click
 * out lose context; confirm before abandoning.
 */
const GUARDED_PATTERNS = [
  /^\/challenge\/(individual|team)\/question-/,
  /^\/challenge\/(individual|team)\/processing/,
  /^\/challenge\/(individual|team)\/beat-/,
  /^\/challenge\/audience/,
]

export function ChallengeNavHome({
  variant = "light",
  className = "",
}: {
  variant?: Variant
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname() || ""
  const [open, setOpen] = useState(false)

  // The Marine palette already pairs ink/background with high contrast, so
  // the "dark" variant is now just a light-on-background tint shift.
  const styles =
    variant === "dark"
      ? "text-foreground/65 hover:text-ink"
      : "text-foreground/65 hover:text-ink"

  const isGuarded = GUARDED_PATTERNS.some((p) => p.test(pathname))

  const linkClass = `text-[11px] uppercase tracking-[0.22em] shrink-0 transition-colors duration-300 ${styles} ${className}`

  if (!isGuarded) {
    return (
      <Link href="/" prefetch={false} className={linkClass}>
        Back to home
      </Link>
    )
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={linkClass}>
        Back to home
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-md border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-[22px] text-ink">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-[1.75] text-foreground/80">
              Your progress won&apos;t be saved. You&apos;ll need to begin the reading
              from the start.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="s-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.push("/")}
              className="s-btn"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
