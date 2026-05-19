"use client"

import { use } from "react"
import { QuestionScreen } from "@/components/challenge/question-screen"
import { useQuestionPrompt } from "@/hooks/use-question-prompts"
import type { Audience } from "@/context/challenge-context"

export default function Question4Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)
  const prompt = useQuestionPrompt(audience, 4)
  const isLoading = prompt === undefined
  const isMissing = prompt === null

  return (
    <QuestionScreen
      audience={audience}
      questionNumber={4}
      stageFraming={prompt?.stageFraming ?? ""}
      question={prompt?.question ?? (isLoading ? "Loading..." : "")}
      prompt={prompt?.prompt ?? ""}
      hintBox={prompt?.hintBox ?? ""}
      placeholder={prompt?.placeholder ?? ""}
      quoteZone={prompt?.quoteZone ?? ""}
      backgroundImage="/images/q4-confident.jpg"
      imageAlt="A figure standing with quiet certainty against open sky — question 4 of the AIMerge clarity diagnostic asks about the moment a leader's most capable self showed up."
      nextRoute={`/challenge/${audience}/question-5`}
      prevRoute={`/challenge/${audience}/question-3`}
      isMissing={isMissing}
    />
  )
}
