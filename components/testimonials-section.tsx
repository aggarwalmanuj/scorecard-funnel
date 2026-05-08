"use client"

import { Quote, Star } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const testimonials = [
  {
    quote: "Life changing. I didn’t know something like this existed.",
    author: "Executive",
    role: "Marbella",
    highlight: true,
  },
  {
    quote:
      "My stress went quiet within days. Better sleep. Less anxiety. More clarity.",
    author: "Nick H.",
    role: "Creative Director",
    highlight: false,
  },
  {
    quote: "I feel deeply at peace in a way I haven’t in years.",
    author: "Manoj P.",
    role: "Senior Leader",
    highlight: false,
  },
  {
    quote:
      "40% operational cost reduction within weeks of working with AI Merge.",
    author: "Michelle J.",
    role: "Business Owner",
    highlight: true,
  },
]

/**
 * Initials are derived from the author label so the avatar tile feels
 * personal without claiming to be a photograph of the speaker. This keeps
 * the design balanced (we removed the stock-style avatars per request) and
 * still gives each card a clear identity anchor.
 */
function initialsOf(author: string): string {
  const parts = author.replace(/[.,]/g, "").trim().split(/\s+/)
  if (parts.length === 0) return "-"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function TestimonialsSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-24 md:py-32 lg:py-40 bg-secondary/30"
      id="testimonials"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`max-w-3xl mx-auto text-center mb-16 sm:mb-20 ${
            isVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-primary bg-secondary neu-border-primary mb-6">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground">
            What people are saying.
          </h2>
          <div className="flex items-center justify-center gap-1 mt-4" aria-hidden>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-5 w-5 fill-primary text-primary" />
            ))}
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.author + index}
              className={`group relative p-7 sm:p-8 rounded-2xl bg-card transition-all duration-300 hover:-translate-y-0.5 ${
                testimonial.highlight ? "neu-card-primary" : "neu-card"
              } ${isVisible ? `animate-fade-in-up delay-${(index + 1) * 100}` : "opacity-0"}`}
            >
              <Quote
                className={`h-10 w-10 mb-5 transition-colors duration-300 ${
                  testimonial.highlight
                    ? "text-primary"
                    : "text-foreground/10 group-hover:text-primary/40"
                }`}
                aria-hidden
              />

              <blockquote className="text-foreground text-base sm:text-lg leading-relaxed font-medium">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Author block - initials chip stands in for the removed photo. */}
              <div className="mt-8 pt-6 border-t-2 border-foreground/5 flex items-center gap-4">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black tracking-tight transition-all duration-300 ${
                    testimonial.highlight
                      ? "bg-primary text-primary-foreground neu-shadow-primary-xs"
                      : "bg-secondary text-primary border-2 border-primary/20 group-hover:border-primary/40"
                  }`}
                  aria-hidden
                >
                  {initialsOf(testimonial.author)}
                </span>
                <div className="min-w-0">
                  <p className="font-extrabold text-foreground truncate">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground font-medium truncate">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
