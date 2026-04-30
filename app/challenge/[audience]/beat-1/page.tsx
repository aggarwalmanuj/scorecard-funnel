"use client"

import { use } from "react"
import { BeatRevealScreen } from "@/components/challenge/beat-reveal-screen"
import { useBeatPrompt } from "@/hooks/use-beat-prompts"
import type { Audience } from "@/context/challenge-context"

export default function Beat1Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)
  const beat = useBeatPrompt(audience, 1)
  return (
    <BeatRevealScreen
      audience={audience}
      beatNumber={1}
      title={beat?.title ?? ""}
      subtitle={beat?.subtitle ?? ""}
      dynamicLabel={beat?.label ?? ""}
      feedbackQuestion={beat?.feedbackQuestion ?? ""}
      backgroundImage="/images/beat-1-mirror.jpg"
      nextRoute={`/challenge/${audience}/beat-2`}
      prevRoute={`/challenge/${audience}/processing`}
    />
  )
}
