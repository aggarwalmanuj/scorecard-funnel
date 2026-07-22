"use client"

import type { ReactNode } from "react"

/**
 * SaaS-style device frame - the "app window" chrome used to showcase the
 * product artifact on the landing and offer pages. Pure CSS, token-driven,
 * SSR-complete (no hydration gating - the frame is in the first HTML byte).
 */
export function MacWindow({
  title,
  children,
  className = "",
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-card ${className}`}
      style={{
        boxShadow:
          "0 30px 80px -24px rgba(var(--shadow-ink), 0.65), 0 0 0 1px color-mix(in srgb, var(--ink) 6%, transparent)",
      }}
    >
      <div className="flex items-center gap-2 border-b border-border bg-background/50 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#e0635e" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#d9a13b" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#4fa763" }} />
        </span>
        <span className="mx-auto -translate-x-4 truncate rounded-md border border-border/60 bg-background/60 px-3 py-0.5 text-[9.5px] uppercase tracking-[0.18em] text-foreground/55">
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}
