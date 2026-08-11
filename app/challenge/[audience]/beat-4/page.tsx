"use client"

import { use } from "react"
import { BeatRevealScreen } from "@/components/challenge/beat-reveal-screen"
import { useBeatPrompt } from "@/hooks/use-beat-prompts"
import type { Audience } from "@/context/challenge-context"
import { beatImage } from "@/lib/vertical-imagery"

export default function Beat4Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)

  const image = beatImage(audience, 4)
  const beat = useBeatPrompt(audience, 4)
  const isLoading = beat === undefined
  return (
    <BeatRevealScreen
      audience={audience}
      beatNumber={4}
      title={beat?.title ?? ""}
      subtitle={beat?.subtitle ?? ""}
      dynamicLabel={beat?.label ?? ""}
      feedbackQuestion={beat?.feedbackQuestion ?? ""}
      backgroundImage={image.src}
      imageAlt={image.alt}
      nextRoute={`/challenge/${audience}/beat-5`}
      prevRoute={`/challenge/${audience}/beat-3`}
      isLoading={isLoading}
    />
  )
}
