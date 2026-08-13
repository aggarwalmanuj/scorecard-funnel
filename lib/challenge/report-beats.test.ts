// Run with: npm test
//
// The report prompt interpolates {{BEAT1}}..{{BEAT5}}, and app/api/challenge/
// report/route.ts renders an empty beat as "(left blank)". The processing
// screen used to fire the report before any beat had streamed, so the cached
// report every Action Plan reads from was written without the reflections.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const SCREEN = new URL(
  "../../components/challenge/processing-screen.tsx",
  import.meta.url,
)

test("the report is never sent hardcoded empty beats", async () => {
  const src = await readFile(SCREEN, "utf8")
  assert.ok(
    !/beats:\s*\{\s*beat1:\s*""/.test(src),
    'the report call must not pass { beat1: "", ... } - the prompt renders those as "(left blank)"',
  )
})

test("the report is generated from the same beats the summary uses", async () => {
  const src = await readFile(SCREEN, "utf8")
  const call = src.slice(src.indexOf("fetchReportInBackground({"))
  assert.match(
    call.slice(0, 400),
    /beats:\s*finalBeats/,
    "the report must receive finalBeats",
  )
})

test("the report call happens after the beats have settled", async () => {
  const src = await readFile(SCREEN, "utf8")
  const beatsSettled = src.indexOf("const results = await Promise.all(tasks)")
  const finalBeats = src.indexOf("const finalBeats")
  const reportCall = src.indexOf("fetchReportInBackground({")

  assert.ok(beatsSettled > 0 && finalBeats > 0 && reportCall > 0, "anchors found")
  assert.ok(
    reportCall > beatsSettled,
    "the report must not start before the beat streams have resolved",
  )
  assert.ok(
    reportCall > finalBeats,
    "the report must be built from finalBeats, so it has to come after it",
  )
})

test("nothing gates navigation on the report, so the later start is free", async () => {
  const src = await readFile(SCREEN, "utf8")
  assert.ok(
    !/state\.reportData/.test(src),
    "moving the report later is only safe while no readiness check reads reportData",
  )
})
