// Run with: npm test

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { MIN_ANSWER_CHARS, answerLength, isAnswerLongEnough } from "@/lib/answer-limits"

test("an answer needs at least 100 characters", () => {
  assert.equal(MIN_ANSWER_CHARS, 100)
  assert.equal(isAnswerLongEnough("x".repeat(99)), false)
  assert.equal(isAnswerLongEnough("x".repeat(100)), true)
})

test("surrounding whitespace does not count toward the minimum", () => {
  assert.equal(answerLength(`   ${"x".repeat(99)}   \n`), 99)
  assert.equal(isAnswerLongEnough(" ".repeat(200)), false)
  assert.equal(isAnswerLongEnough(undefined), false)
})

test("the question screen gates Continue on the minimum", async () => {
  const src = await readFile(new URL("../components/challenge/question-screen.tsx", import.meta.url), "utf8")
  assert.match(src, /disabled=\{isNavigating \|\| !answerLongEnough\}/)
  assert.match(src, /if \(!answerLongEnough\) return/)
})
