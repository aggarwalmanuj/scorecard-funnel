"use client"

import { use } from "react"
import { QuestionScreen } from "@/components/challenge/question-screen"
import { useQuestionPrompt } from "@/hooks/use-question-prompts"
import type { Audience } from "@/context/challenge-context"
import { questionImage } from "@/lib/vertical-imagery"

export default function Question4Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)

  const image = questionImage(audience, 4)
  const prompt = useQuestionPrompt(audience, 4)
  const isLoading = prompt === undefined
  const isMissing = prompt === null

  return (
    <QuestionScreen
      audience={audience}
      questionNumber={4}
      stageFraming={prompt?.stageFraming ?? ""}
      question={prompt?.question ?? ""}
      prompt={prompt?.prompt ?? ""}
      hintBox={prompt?.hintBox ?? ""}
      placeholder={prompt?.placeholder ?? ""}
      quoteZone={prompt?.quoteZone ?? ""}
      backgroundImage={image.src}
      imageAlt={image.alt}
      nextRoute={`/challenge/${audience}/question-5`}
      prevRoute={`/challenge/${audience}/question-3`}
      isMissing={isMissing}
      isLoading={isLoading}
    />
  )
}
