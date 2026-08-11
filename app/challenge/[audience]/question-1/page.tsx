"use client"

import { use } from "react"
import { QuestionScreen } from "@/components/challenge/question-screen"
import { useQuestionPrompt } from "@/hooks/use-question-prompts"
import type { Audience } from "@/context/challenge-context"
import { questionImage } from "@/lib/vertical-imagery"

export default function Question1Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)

  const image = questionImage(audience, 1)
  const prompt = useQuestionPrompt(audience, 1)
  const isLoading = prompt === undefined
  const isMissing = prompt === null

  return (
    <QuestionScreen
      audience={audience}
      questionNumber={1}
      stageFraming={prompt?.stageFraming ?? ""}
      question={prompt?.question ?? ""}
      prompt={prompt?.prompt ?? ""}
      hintBox={prompt?.hintBox ?? ""}
      placeholder={prompt?.placeholder ?? ""}
      quoteZone={prompt?.quoteZone ?? ""}
      backgroundImage={image.src}
      imageAlt={image.alt}
      nextRoute={`/challenge/${audience}/question-2`}
      prevRoute={`/challenge/audience?vertical=${audience}`}
      isMissing={isMissing}
      isLoading={isLoading}
    />
  )
}
