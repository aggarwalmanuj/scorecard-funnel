"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
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

export function ChallengeMenuButton({
  variant = "light",
  className,
}: {
  variant?: Variant
  className?: string
}) {
  const isDark = variant === "dark"
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className={cn(
            "shrink-0 rounded-xl -ml-1",
            isDark
              ? "text-white/85 hover:bg-white/10 hover:text-white"
              : "text-foreground hover:bg-secondary/60 hover:text-primary",
            className,
          )}
        >
          <Menu className="size-5" strokeWidth={2} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,320px)] border-border bg-background">
        <SheetHeader className="text-left border-b border-border/80 pb-4">
          <SheetTitle className="font-black text-foreground">Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 pt-6" aria-label="Site">
          <SheetClose asChild>
            <Link
              href="/"
              prefetch={false}
              className="text-[15px] font-medium text-foreground px-3 py-3 rounded-xl hover:bg-card border border-transparent hover:border-border transition-colors"
            >
              Home
            </Link>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
