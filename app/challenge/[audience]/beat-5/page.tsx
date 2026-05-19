"use client"

import { use } from "react"
import { BeatRevealScreen } from "@/components/challenge/beat-reveal-screen"
import { useBeatPrompt } from "@/hooks/use-beat-prompts"
import type { Audience } from "@/context/challenge-context"

export default function Beat5Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)
  const beat = useBeatPrompt(audience, 5)
  return (
    <BeatRevealScreen
      audience={audience}
      beatNumber={5}
      title={beat?.title ?? ""}
      subtitle={beat?.subtitle ?? ""}
      dynamicLabel={beat?.label ?? ""}
      feedbackQuestion={beat?.feedbackQuestion ?? ""}
      backgroundImage="/images/beat-5-clarity.jpg"
      imageAlt="A still morning room flooded with quiet light — reflection 5 of the AIMerge clarity diagnostic shows the one decision that clears the interference."
      nextRoute={`/challenge/${audience}/summary`}
      prevRoute={`/challenge/${audience}/beat-4`}
    />
  )
}
