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
 * confirmation (task 8). The challenge experience is stateful and users who
 * click out lose context; confirm before abandoning.
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

  const styles =
    variant === "dark"
      ? "text-white/65 hover:text-white/95 underline-offset-2 hover:underline decoration-white/35"
      : "text-primary hover:text-primary/80 underline-offset-2 hover:underline decoration-primary/40"

  const isGuarded = GUARDED_PATTERNS.some((p) => p.test(pathname))

  if (!isGuarded) {
    return (
      <Link
        href="/"
        prefetch={false}
        className={`text-[12px] font-medium shrink-0 ${styles} ${className}`}
      >
        Back to home
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-[12px] font-medium shrink-0 cursor-pointer ${styles} ${className}`}
      >
        Back to home
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-2xl border-2 border-foreground/15 neu-shadow-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black tracking-tight text-[20px]">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-relaxed">
              Your progress won&apos;t be saved. You&apos;ll need to restart the challenge from the beginning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold neu-btn-press">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.push("/")}
              className="rounded-xl font-bold neu-border-primary neu-shadow-primary-xs neu-btn-press"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
