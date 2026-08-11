"use client"

import { use } from "react"
import { BeatRevealScreen } from "@/components/challenge/beat-reveal-screen"
import { useBeatPrompt } from "@/hooks/use-beat-prompts"
import type { Audience } from "@/context/challenge-context"
import { beatImage } from "@/lib/vertical-imagery"

export default function Beat5Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)

  const image = beatImage(audience, 5)
  const beat = useBeatPrompt(audience, 5)
  const isLoading = beat === undefined
  return (
    <BeatRevealScreen
      audience={audience}
      beatNumber={5}
      title={beat?.title ?? ""}
      subtitle={beat?.subtitle ?? ""}
      dynamicLabel={beat?.label ?? ""}
      feedbackQuestion={beat?.feedbackQuestion ?? ""}
      backgroundImage={image.src}
      imageAlt={image.alt}
      nextRoute={`/challenge/${audience}/summary`}
      prevRoute={`/challenge/${audience}/beat-4`}
      isLoading={isLoading}
    />
  )
}
