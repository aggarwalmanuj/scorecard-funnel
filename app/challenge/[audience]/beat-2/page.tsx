"use client"

import { use } from "react"
import { BeatRevealScreen } from "@/components/challenge/beat-reveal-screen"
import { useBeatPrompt } from "@/hooks/use-beat-prompts"
import type { Audience } from "@/context/challenge-context"

export default function Beat2Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)
  const beat = useBeatPrompt(audience, 2)
  return (
    <BeatRevealScreen
      audience={audience}
      beatNumber={2}
      title={beat?.title ?? ""}
      subtitle={beat?.subtitle ?? ""}
      dynamicLabel={beat?.label ?? ""}
      feedbackQuestion={beat?.feedbackQuestion ?? ""}
      backgroundImage="/images/beat-2-direction.jpg"
      imageAlt="An open horizon stretching forward — reflection 2 of the AIMerge clarity diagnostic surfaces the direction your subconscious has already chosen."
      nextRoute={`/challenge/${audience}/beat-3`}
      prevRoute={`/challenge/${audience}/beat-1`}
    />
  )
}
