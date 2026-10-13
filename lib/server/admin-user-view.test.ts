// Run with: npm test
//
// Respondents' raw answers are private. The admin console may learn only
// whether each question was answered, never what was written.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  ADMIN_USER_PROJECTION,
  ADMIN_VISIBLE_FIELDS,
  ANSWER_FIELDS,
  toAdminUserView,
} from "./admin-user-view.ts"

const SECRET = "my private answer"

const fullDoc = {
  id: "42",
  firstName: "Sam",
  email: "sam@example.com",
  question1: SECRET,
  question2: "   ",
  question3: "",
  question5: SECRET,
  question1_text: "What do you want?",
  beat1_feedback: "loved it",
  beat1_output: "generated reflection",
  report_json: "{}",
  createdAt: "2026-10-01T00:00:00.000Z",
}

test("full document: answer text is dropped, answered flags derived", () => {
  const view = toAdminUserView(fullDoc)
  assert.ok(!JSON.stringify(view).includes(SECRET))
  for (const f of ANSWER_FIELDS) assert.equal(f in view, false)
  // Whitespace-only and missing answers both count as unanswered.
  assert.deepEqual(view.answered, [true, false, false, false, true])
})

test("feedback, beat outputs and prompt text stay visible", () => {
  const view = toAdminUserView(fullDoc)
  assert.equal(view.beat1_feedback, "loved it")
  assert.equal(view.beat1_output, "generated reflection")
  assert.equal(view.question1_text, "What do you want?")
})

test("projected row: Cosmos-computed flags win, raw text never echoed", () => {
  const view = toAdminUserView({
    id: "7",
    email: "a@b.c",
    answered1: true,
    answered2: false,
    answered3: true,
    answered4: false,
    answered5: false,
  })
  assert.deepEqual(view.answered, [true, false, true, false, false])
  assert.equal("answered1" in view, false)
})

test("unknown columns are not passed through", () => {
  const view = toAdminUserView({ ...fullDoc, someFutureField: SECRET })
  assert.equal("someFutureField" in view, false)
})

test("projection never selects a raw answer column", () => {
  // Answer columns may appear only inside the boolean answered-predicate.
  const outsidePredicates = ADMIN_USER_PROJECTION.replace(
    /\(IS_STRING\(c\.\w+\) AND LENGTH\(TRIM\(c\.\w+\)\) > 0\)/g,
    "",
  )
  for (const f of ANSWER_FIELDS) {
    assert.equal(
      new RegExp(`c\\.${f}(?!\\w)`).test(outsidePredicates),
      false,
      `${f} leaks into the SELECT list`,
    )
    assert.equal((ADMIN_VISIBLE_FIELDS as readonly string[]).includes(f), false)
  }
})
