"use client"

import { use } from "react"
import { BeatRevealScreen } from "@/components/challenge/beat-reveal-screen"
import { useBeatPrompt } from "@/hooks/use-beat-prompts"
import type { Audience } from "@/context/challenge-context"

export default function Beat4Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)
  const beat = useBeatPrompt(audience, 4)
  return (
    <BeatRevealScreen
      audience={audience}
      beatNumber={4}
      title={beat?.title ?? ""}
      subtitle={beat?.subtitle ?? ""}
      dynamicLabel={beat?.label ?? ""}
      feedbackQuestion={beat?.feedbackQuestion ?? ""}
      backgroundImage="/images/beat-4-pattern.jpg"
      imageAlt="A pattern of light tracing through stone — reflection 4 of the AIMerge clarity diagnostic recalls the conditions under which a leader's most capable self showed up."
      nextRoute={`/challenge/${audience}/beat-5`}
      prevRoute={`/challenge/${audience}/beat-3`}
    />
  )
}
