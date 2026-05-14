import { Shield } from "lucide-react"

const PRIVACY_TEXT =
  "Your responses are reviewed by the TetraNoodle team for diagnostic purposes and to improve the AI Merge system. Your data is kept strictly private and never shared with third parties."

/**
 * GDPR-aware privacy disclosure shown anywhere we collect or process user
 * input. Replaces the older short tags ("Private and secure · Never
 * shared", "In confidence") with a fuller, audit-friendly statement.
 *
 * Two variants:
 *   - default: a small Shield + sentence block, suited to form footers.
 *   - "compact": same text rendered as a single paragraph without the
 *     icon, for cases where vertical space is tight (e.g. the closing
 *     CTA card meta line).
 */
export function PrivacyNotice({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "compact"
  className?: string
}) {
  if (variant === "compact") {
    return (
      <p
        className={`text-[11.5px] leading-[1.65] text-foreground/65 ${className}`}
      >
        {PRIVACY_TEXT}
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
      <span>{PRIVACY_TEXT}</span>
    </p>
  )
}
