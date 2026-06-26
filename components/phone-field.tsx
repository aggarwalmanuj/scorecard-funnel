"use client"

import { ChevronDown } from "lucide-react"
import { COUNTRY_CODES } from "@/lib/country-codes"

/**
 * Phone input with a country-code dropdown. Fully CONTROLLED — the parent owns
 * the country `code` and local `num`, so the values survive when the field is
 * unmounted/remounted (e.g. toggling between steps of the signup). The parent
 * derives the combined "+<dial> <number>" string from these (see dialFor).
 * ISO code is the <option> value because dial codes aren't unique (US/CA = +1).
 */
export function PhoneField({
  id,
  invalid,
  describedBy,
  code,
  num,
  onCodeChange,
  onNumChange,
  onBlur,
}: {
  id?: string
  invalid?: boolean
  describedBy?: string
  code: string
  num: string
  onCodeChange: (code: string) => void
  onNumChange: (num: string) => void
  onBlur?: () => void
}) {
  return (
    <div className="flex gap-2">
      <div className="relative shrink-0">
        <select
          aria-label="Country code"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          className="s-input h-12 appearance-none pl-3 pr-8 font-sans"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50"
          strokeWidth={1.6}
          aria-hidden
        />
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        data-lpignore="true"
        data-form-type="other"
        placeholder="555 123 4567"
        value={num}
        onChange={(e) => onNumChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={`s-input h-12 flex-1 ${invalid ? "ring-1 ring-destructive/60" : ""}`}
      />
    </div>
  )
}
