/**
 * Minimum length for an answer to any of the five questions. Short answers
 * give the beats and the report too little to work from, so Continue stays
 * disabled until the participant has written (or dictated) at least this much.
 * Counted on the trimmed text, so padding with spaces does not count.
 */
export const MIN_ANSWER_CHARS = 100

export function answerLength(answer: string | null | undefined): number {
  return answer?.trim().length ?? 0
}

export function isAnswerLongEnough(answer: string | null | undefined): boolean {
  return answerLength(answer) >= MIN_ANSWER_CHARS
}
