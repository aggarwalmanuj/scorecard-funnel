import Link from "next/link"
import { Shield } from "lucide-react"

/**
 * Compact privacy disclosure shown next to form CTAs. Replaces the older
 * long-form statement with a short pointer to the canonical Privacy and
 * Terms documents.
 *
 * Two variants:
 *   - default: a small Shield + sentence block, suited to form footers.
 *   - "compact": same content rendered without the icon for tight spots
 *     (e.g. inline next to a Continue button on the question footer).
 */
export function PrivacyNotice({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "compact"
  className?: string
}) {
  const linkClass =
    "underline underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"

  const body = (
    <>
      Read our{" "}
      <Link href="/privacy" className={linkClass} prefetch={false}>
        Privacy
      </Link>{" "}
      and{" "}
      <Link href="/terms" className={linkClass} prefetch={false}>
        Terms
      </Link>
      .
    </>
  )

  if (variant === "compact") {
    return (
      <p
        className={`text-[11.5px] leading-[1.65] text-foreground/65 ${className}`}
      >
        {body}
      </p>
    )
  }
  return (
    <p
      className={`flex items-start gap-2.5 text-[12px] leading-[1.65] text-foreground/70 ${className}`}
    >
      <Shield
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/55"
        strokeWidth={1.6}
        aria-hidden
      />
      <span>{body}</span>
    </p>
  )
}
