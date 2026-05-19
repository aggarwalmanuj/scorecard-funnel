"use client"

import { use } from "react"
import { QuestionScreen } from "@/components/challenge/question-screen"
import { useQuestionPrompt } from "@/hooks/use-question-prompts"
import type { Audience } from "@/context/challenge-context"

export default function Question1Page({ params }: { params: Promise<{ audience: Audience }> }) {
  const { audience } = use(params)
  const prompt = useQuestionPrompt(audience, 1)
  const isLoading = prompt === undefined
  const isMissing = prompt === null

  return (
    <QuestionScreen
      audience={audience}
      questionNumber={1}
      stageFraming={prompt?.stageFraming ?? ""}
      question={prompt?.question ?? (isLoading ? "Loading..." : "")}
      prompt={prompt?.prompt ?? ""}
      hintBox={prompt?.hintBox ?? ""}
      placeholder={prompt?.placeholder ?? ""}
      quoteZone={prompt?.quoteZone ?? ""}
      backgroundImage="/images/q1-conversation.jpg"
      imageAlt="Two figures in quiet conversation across a low table — question 1 of the AIMerge clarity diagnostic asks what isn't moving the way it should."
      nextRoute={`/challenge/${audience}/question-2`}
      prevRoute="/challenge/audience"
      isMissing={isMissing}
    />
  )
}
