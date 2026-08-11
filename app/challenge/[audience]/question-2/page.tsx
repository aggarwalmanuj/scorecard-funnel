"use client"

import { use } from "react"
import { QuestionScreen } from "@/components/challenge/question-screen"
import { useQuestionPrompt } from "@/hooks/use-question-prompts"
import type { Audience } from "@/context/challenge-context"
import { questionImage } from "@/lib/vertical-imagery"

export default function Question2Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)

  const image = questionImage(audience, 2)
  const prompt = useQuestionPrompt(audience, 2)
  const isLoading = prompt === undefined
  const isMissing = prompt === null

  return (
    <QuestionScreen
      audience={audience}
      questionNumber={2}
      stageFraming={prompt?.stageFraming ?? ""}
      question={prompt?.question ?? ""}
      prompt={prompt?.prompt ?? ""}
      hintBox={prompt?.hintBox ?? ""}
      placeholder={prompt?.placeholder ?? ""}
      quoteZone={prompt?.quoteZone ?? ""}
      backgroundImage={image.src}
      imageAlt={image.alt}
      nextRoute={`/challenge/${audience}/question-3`}
      prevRoute={`/challenge/${audience}/question-1`}
      isMissing={isMissing}
      isLoading={isLoading}
    />
  )
}
