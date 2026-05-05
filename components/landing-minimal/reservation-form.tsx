"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { MagneticButton } from "./motion"

/**
 * Inline reservation form, modelled on the Sensorium "Begin your free
 * preview" card. The actual lead-capture flow continues to live at
 * /challenge/audience — we just hand off the values via the URL.
 */
export function ReservationForm({
  id,
  eyebrow = "Reserve your reading",
  title = "Five quiet questions. One personal preview.",
}: {
  id?: string
  eyebrow?: string
  title?: string
}) {
  const router = useRouter()
  const [first, setFirst] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!first.trim()) return setError("Please share your first name")
    if (!email.trim() || !email.includes("@"))
      return setError("Please enter a valid email")

    const params = new URLSearchParams()
    params.set("first", first.trim())
    params.set("email", email.trim())
    router.push(`/challenge/audience?${params.toString()}`)
  }

  return (
    <form
      id={id}
      onSubmit={onSubmit}
      className="rounded-md p-6 sm:p-7"
      style={{
        backgroundColor: "color-mix(in srgb, var(--card) 92%, transparent)",
        border: "1px solid color-mix(in srgb, var(--foreground) 18%, transparent)",
        boxShadow: "0 18px 50px -35px rgba(var(--shadow-ink), 0.4)",
      }}
    >
      <p className="eyebrow" style={{ color: "color-mix(in srgb, var(--foreground) 72%, transparent)" }}>
        {eyebrow}
      </p>
      <p className="font-serif-italic mt-1.5 text-[18px] leading-snug" style={{ color: "var(--ink)" }}>
        {title}
      </p>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span
            className="eyebrow mb-2 block"
            style={{ color: "color-mix(in srgb, var(--foreground) 72%, transparent)" }}
          >
            First name
          </span>
          <input
            type="text"
            autoComplete="given-name"
            value={first}
            onChange={(e) => {
              setFirst(e.target.value)
              setError("")
            }}
            placeholder="How we will greet you"
            className="s-input"
            required
          />
        </label>
        <label className="block">
          <span
            className="eyebrow mb-2 block"
            style={{ color: "color-mix(in srgb, var(--foreground) 72%, transparent)" }}
          >
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError("")
            }}
            placeholder="name@email.com"
            className="s-input"
            required
          />
        </label>
      </div>

      {error && (
        <p
          className="mt-4 text-sm font-medium"
          style={{ color: "var(--destructive, #a04b3d)" }}
        >
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
        <MagneticButton className="flex-1">
          <button type="submit" className="s-btn group w-full justify-center">
            Begin the reading
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1"
              strokeWidth={1.6}
            />
          </button>
        </MagneticButton>
        <p
          className="text-[0.7rem] uppercase tracking-[0.22em] sm:text-right"
          style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}
        >
          Ten minutes
          <span className="block sm:inline sm:ml-2">In confidence</span>
        </p>
      </div>
    </form>
  )
}
