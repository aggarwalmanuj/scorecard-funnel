"use client"

import { use } from "react"
import { BeatRevealScreen } from "@/components/challenge/beat-reveal-screen"
import { useBeatPrompt } from "@/hooks/use-beat-prompts"
import type { Audience } from "@/context/challenge-context"

export default function Beat3Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)
  const beat = useBeatPrompt(audience, 3)
  return (
    <BeatRevealScreen
      audience={audience}
      beatNumber={3}
      title={beat?.title ?? ""}
      subtitle={beat?.subtitle ?? ""}
      dynamicLabel={beat?.label ?? ""}
      feedbackQuestion={beat?.feedbackQuestion ?? ""}
      backgroundImage="/images/beat-3-noise.jpg"
      imageAlt="Quiet water disturbed by ripples — reflection 3 of the AIMerge clarity diagnostic names the structural noise pulling at a leader's attention."
      nextRoute={`/challenge/${audience}/beat-4`}
      prevRoute={`/challenge/${audience}/beat-2`}
    />
  )
}
