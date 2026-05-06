"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Reveal } from "./motion"

const faqs = [
  {
    q: "Is this a personality test?",
    a: "No. There are no labels and no archetypes. Your reading is a precise diagnostic across seven dimensions of life and work - naming the specific pattern quietly limiting your results.",
  },
  {
    q: "I have tried coaching and retreats. How is this different?",
    a: "Most approaches deliver information or general insight. The reading names the specific pattern running against you - so precisely you recognise it the moment it surfaces. Built on a framework peer-reviewed in the Mensa Research Journal.",
  },
  {
    q: "Will I be sold something at the end?",
    a: "There is nothing to buy during the reading. The full PDF report is delivered after your assessment. If you wish to go deeper, an option is offered - only when relevant to what surfaced.",
  },
  {
    q: "How long does it actually take?",
    a: "Ten minutes. Some take longer because they want to sit with a question. That is fine. The reading itself is composed to take ten quiet minutes.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. Your data belongs to you, always. Nothing is shared, sold, or templated. Your score and report are composed specifically around your inputs - not a generic algorithm.",
  },
] as const

export function NotesSection() {
  return (
    <section id="notes" className="py-16 sm:py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-16">
        <Reveal as="div" className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-6 text-foreground/70">VII · Notes</p>
            <h2 className="font-serif text-[1.95rem] leading-[1.08] text-ink sm:text-5xl sm:leading-[1.05] lg:text-6xl">
              A few quiet
              <span className="block font-serif-italic text-foreground">
                questions before you begin.
              </span>
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-[1.8] text-foreground/80">
              Answered in the spirit we hope you will bring to the reading
              itself - plainly, and without hurry.
            </p>
          </div>

          <div className="lg:col-span-7">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`note-${i}`}
                  className="border-b-0 border-t border-border first:border-t last:border-b transition-colors duration-500 hover:border-ink/40 data-[state=open]:border-ink/40"
                >
                  <AccordionTrigger className="py-6 pr-2 text-left transition-colors hover:no-underline">
                    <span className="font-serif text-[18px] leading-snug text-ink transition-colors sm:text-[20px]">
                      {f.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-7 pr-4 text-[15px] leading-[1.8] text-foreground/80 sm:text-base">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
