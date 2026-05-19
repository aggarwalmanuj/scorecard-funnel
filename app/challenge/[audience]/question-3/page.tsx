"use client"

import { use } from "react"
import { QuestionScreen } from "@/components/challenge/question-screen"
import { useQuestionPrompt } from "@/hooks/use-question-prompts"
import type { Audience } from "@/context/challenge-context"

export default function Question3Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)
  const prompt = useQuestionPrompt(audience, 3)
  const isLoading = prompt === undefined
  const isMissing = prompt === null

  return (
    <QuestionScreen
      audience={audience}
      questionNumber={3}
      stageFraming={prompt?.stageFraming ?? ""}
      question={prompt?.question ?? (isLoading ? "Loading..." : "")}
      prompt={prompt?.prompt ?? ""}
      hintBox={prompt?.hintBox ?? ""}
      placeholder={prompt?.placeholder ?? ""}
      quoteZone={prompt?.quoteZone ?? ""}
      backgroundImage="/images/q3-nature.jpg"
      imageAlt="A weathered branch curling through still air — question 3 of the AIMerge clarity diagnostic surfaces the noise pulling at a leader's attention."
      nextRoute={`/challenge/${audience}/question-4`}
      prevRoute={`/challenge/${audience}/question-2`}
      isMissing={isMissing}
    />
  )
}
