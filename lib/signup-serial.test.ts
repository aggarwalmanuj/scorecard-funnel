// Run with: npm test
//
// The serial number is the address every later write uses. Losing it does not
// cost one row, it costs the whole participant: they finish the assessment,
// see their result, and nothing after the signup is ever recorded. These tests
// pin the retry that keeps a single transient failure from doing that.

import { test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"

import { submitSignup } from "./submit-to-google-sheet.ts"

type FetchCall = { url: string; body: unknown }

const realFetch = globalThis.fetch
const realWarn = console.warn
const realError = console.error
let calls: FetchCall[] = []
let logs: string[] = []

/** Queue one response per attempt; the last entry repeats if exhausted. */
function stubFetch(responses: Array<{ ok: boolean; json?: unknown } | "throw">) {
  let i = 0
  globalThis.fetch = (async (url: string, init: { body: string }) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) })
    const r = responses[Math.min(i++, responses.length - 1)]
    if (r === "throw") throw new Error("network")
    return {
      ok: r.ok,
      status: r.ok ? 200 : 500,
      json: async () => r.json ?? {},
    }
  }) as unknown as typeof globalThis.fetch
}

beforeEach(() => {
  calls = []
  logs = []
  console.warn = (...a: unknown[]) => void logs.push(a.join(" "))
  console.error = (...a: unknown[]) => void logs.push(a.join(" "))
  // localStorage-backed attribution is not available under node:test.
  ;(globalThis as { window?: unknown }).window = undefined
})

afterEach(() => {
  globalThis.fetch = realFetch
  console.warn = realWarn
  console.error = realError
})

test("returns the serial on a first-attempt success, without retrying", async () => {
  stubFetch([{ ok: true, json: { serialNumber: 163 } }])
  const serial = await submitSignup("ZZ", "zz@example.com", "parents")
  assert.equal(serial, 163)
  assert.equal(calls.length, 1, "a success must not retry")
})

test("retries a 5xx and returns the serial from a later attempt", async () => {
  stubFetch([{ ok: false }, { ok: true, json: { serialNumber: 164 } }])
  const serial = await submitSignup("ZZ", "zz@example.com", "parents")
  assert.equal(serial, 164, "one transient failure must not cost the participant")
  assert.equal(calls.length, 2)
})

test("retries a network throw", async () => {
  stubFetch(["throw", { ok: true, json: { serialNumber: 165 } }])
  assert.equal(await submitSignup("ZZ", "zz@example.com", "parents"), 165)
  assert.equal(calls.length, 2)
})

test("a 200 carrying no serialNumber is retried, not silently accepted", async () => {
  // The hardest failure to spot afterwards: the request looks fine in the
  // network panel and the row never appears.
  stubFetch([{ ok: true, json: { ok: true } }, { ok: true, json: { serialNumber: 166 } }])
  const serial = await submitSignup("ZZ", "zz@example.com", "parents")
  assert.equal(serial, 166)
  assert.equal(calls.length, 2)
  assert.ok(
    logs.some((l) => /no serialNumber/i.test(l)),
    "the silent 200 path must be logged",
  )
})

test("gives up after 3 attempts and says what it costs", async () => {
  stubFetch([{ ok: false }])
  const serial = await submitSignup("ZZ", "zz@example.com", "parents")
  assert.equal(serial, null, "the funnel still proceeds - it must not block the user")
  assert.equal(calls.length, 3, "exactly three attempts")
  assert.ok(
    logs.some((l) => /will NOT be recorded/i.test(l)),
    "final failure must be loud enough to find in a session recording",
  )
})

test("every attempt posts the identical signup body", async () => {
  stubFetch([{ ok: false }, { ok: false }, { ok: true, json: { serialNumber: 167 } }])
  await submitSignup("ZZ", "zz@example.com", "parents")
  assert.equal(calls.length, 3)
  const bodies = calls.map((c) => JSON.stringify(c.body))
  assert.equal(new Set(bodies).size, 1, "a retry must not vary the payload")
  const first = calls[0].body as { action: string; email: string }
  assert.equal(first.action, "signup")
  assert.equal(first.email, "zz@example.com")
})
