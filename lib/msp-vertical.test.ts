// Run with: npm test
//
// The MSP vertical is the standard paid funnel with MSP words. Its failure
// modes are silent: a missing alias runs paid MSP traffic through the main
// funnel, and a half-filled shellCopy shows MSP owners "Reflection" and
// "mirror" copy on some screens and not others.

import { test } from "node:test"
import assert from "node:assert/strict"
import { normalizeVertical } from "@/lib/verticals"
import { displayFor } from "@/lib/vertical-display"

test("the MSP landing page's lp= slug resolves to the msp vertical", () => {
  // msp-landing/lib/scorecard.ts sends LP_SLUG = "msp".
  assert.equal(normalizeVertical("msp"), "msp")
  assert.equal(normalizeVertical(" MSP "), "msp")
})

test("msp runs the standard paid flow", () => {
  const d = displayFor("msp")
  assert.equal(d.offerVariant, "b2c")
  assert.equal(d.productName, "MSP AI Opportunity Score")
  assert.equal(d.reportName, "MSP Opportunity Action Plan")
  assert.ok(d.reportName.length <= 35, "reportName must fit the PDF footer")
})

test("msp shell copy is complete", () => {
  const s = displayFor("msp").shellCopy
  assert.ok(s)
  assert.equal(s.processingSteps.length, 8, "the ticker walks exactly eight slots")
  assert.equal(s.feedbackOptions.length, 5, "one label set per beat")
  for (const set of s.feedbackOptions) assert.equal(set.length, 3)
  assert.equal(s.offerClosingLines.length, 3)
})

test("msp visitor-facing copy uses real dashes, never em dashes or spaced hyphens", () => {
  const d = displayFor("msp")
  const text = JSON.stringify({
    shell: d.shellCopy,
    pitch: d.offerPitch,
    accent: d.offerAccent,
    anchor: d.offerPriceAnchor,
    unlock: d.summaryUnlock,
    howToRead: d.howToRead,
    pillars: d.pillarLabels,
  })
  assert.equal((text.match(/—/g) || []).length, 0, "no em dashes")
  assert.equal((text.match(/ - /g) || []).length, 0, "no spaced hyphen standing in for a dash")
})

test("verticals without shell copy keep the shared wording", () => {
  assert.equal(displayFor("main").shellCopy, undefined)
  assert.equal(displayFor("coaches").shellCopy, undefined)
})
