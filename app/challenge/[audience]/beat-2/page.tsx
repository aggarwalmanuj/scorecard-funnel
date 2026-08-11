"use client"

import { use } from "react"
import { BeatRevealScreen } from "@/components/challenge/beat-reveal-screen"
import { useBeatPrompt } from "@/hooks/use-beat-prompts"
import type { Audience } from "@/context/challenge-context"
import { beatImage } from "@/lib/vertical-imagery"

export default function Beat2Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)

  const image = beatImage(audience, 2)
  const beat = useBeatPrompt(audience, 2)
  const isLoading = beat === undefined
  return (
    <BeatRevealScreen
      audience={audience}
      beatNumber={2}
      title={beat?.title ?? ""}
      subtitle={beat?.subtitle ?? ""}
      dynamicLabel={beat?.label ?? ""}
      feedbackQuestion={beat?.feedbackQuestion ?? ""}
      backgroundImage={image.src}
      imageAlt={image.alt}
      nextRoute={`/challenge/${audience}/beat-3`}
      prevRoute={`/challenge/${audience}/beat-1`}
      isLoading={isLoading}
    />
  )
}
