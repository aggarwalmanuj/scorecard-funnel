import { NextResponse } from "next/server"
import { z } from "zod"
import { isCosmosConfigured, appendSignupRow, updateQuestionCell, updateFeedbackCell, updateBeatOutputCell, updateUserOutputs, updateUserTelemetry, recordPurchase } from "@/lib/server/cosmos-db"
import { redactError } from "@/lib/security"

const bodySchema = z.object({
  action: z.enum(["signup", "answer", "feedback", "beat_output", "score", "report", "summary", "telemetry", "purchase"]),
  firstName: z.preprocess(
    (v) => (v == null ? "" : String(v).trim().slice(0, 200)),
    z.string().max(200)
  ),
  email: z.preprocess(
    (v) => (v == null ? "" : String(v).trim().slice(0, 320)),
    z.string().max(320).email("Invalid email format")
  ),
  // Optional WhatsApp/phone (signup action) for sales follow-up.
  phone: z.preprocess(
    (v) => (v == null ? undefined : String(v).trim().slice(0, 40)),
    z.string().max(40).optional()
  ),
  audience: z.enum(["individual", "team"]).optional(),
  serialNumber: z.number().int().positive().optional(),
  questionNumber: z.number().int().min(1).max(5).optional(),
  answer: z.string().max(50000).optional(),
  // Snapshot of the prompt text shown to the user. Capped to keep documents
  // well under Cosmos's 2 MB item ceiling - admin question copy is short.
  questionText: z.preprocess(
    (v) => (v == null ? undefined : String(v)),
    z.string().max(4000).optional()
  ),
  beatNumber: z.number().int().min(1).max(5).optional(),
  feedback: z.string().max(200).optional(),
  output: z.string().max(50000).optional(),
  // Final-output payloads. Caps are generous but bounded so a single
  // document stays well under Cosmos's 2 MB item limit. Audio is NOT sent
  // here (binary lives in Blob — see /api/challenge/persist-summary-audio).
  scoreJson: z.string().max(20000).optional(),
  reportJson: z.string().max(120000).optional(),
  summaryText: z.string().max(20000).optional(),
  // Tech-analytics telemetry + purchase recording.
  phSessionId: z.string().max(200).optional(),
  phDistinctId: z.string().max(200).optional(),
  paidTier: z
    .enum(["diagnostic", "session", "transformation", "elevated"])
    .optional(),
  paidAmount: z.string().max(20).optional(),
  // First-touch acquisition attribution (signup action only). Capped so a
  // signup can't bloat the document; server re-trims via sanitizeAttribution.
  attribution: z
    .object({
      utm_source: z.string().max(500).optional(),
      utm_medium: z.string().max(500).optional(),
      utm_campaign: z.string().max(500).optional(),
      utm_term: z.string().max(500).optional(),
      utm_content: z.string().max(500).optional(),
      // Ad-platform click IDs (which platform drove the click).
      fbclid: z.string().max(500).optional(),
      gclid: z.string().max(500).optional(),
      ttclid: z.string().max(500).optional(),
      msclkid: z.string().max(500).optional(),
      // Cross-reference back to the originating landing page.
      ref: z.string().max(500).optional(),
      lp: z.string().max(500).optional(),
      referrer: z.string().max(500).optional(),
      landing_page: z.string().max(500).optional(),
    })
    .optional(),
})

export async function POST(request: Request) {
  if (!isCosmosConfigured()) {
    console.warn("[sheets/append] Skipped: Cosmos DB not configured.")
    return NextResponse.json({ ok: true, skipped: true, reason: "not_configured" })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { action, firstName, email, phone, audience, serialNumber, questionNumber, answer, questionText, beatNumber, feedback, output, scoreJson, reportJson, summaryText, phSessionId, phDistinctId, paidTier, paidAmount, attribution } = parsed.data

  try {
    if (action === "signup") {
      // Always appends a new row, even for repeat emails. Returns the new S.No.
      const sno = await appendSignupRow(firstName, email, audience ?? "", attribution, phone)
      return NextResponse.json({ ok: true, serialNumber: sno })
    } else if (action === "answer" && questionNumber && answer !== undefined) {
      if (!serialNumber) {
        return NextResponse.json(
          { ok: false, error: "Missing serialNumber for answer action" },
          { status: 400 }
        )
      }
      await updateQuestionCell(serialNumber, firstName, email, questionNumber, answer, questionText)
    } else if (action === "feedback" && beatNumber && feedback) {
      if (!serialNumber) {
        return NextResponse.json(
          { ok: false, error: "Missing serialNumber for feedback action" },
          { status: 400 }
        )
      }
      await updateFeedbackCell(serialNumber, firstName, email, beatNumber, feedback)
    } else if (action === "beat_output" && beatNumber && output !== undefined) {
      if (!serialNumber) {
        console.warn("[sheets/append] beat_output missing serialNumber for beat", beatNumber)
        return NextResponse.json(
          { ok: false, error: "Missing serialNumber for beat_output action" },
          { status: 400 }
        )
      }
      console.log("[sheets/append] Saving beat_output:", { serialNumber, beatNumber, outputLen: output.length })
      await updateBeatOutputCell(serialNumber, firstName, email, beatNumber, output)
    } else if (action === "score" || action === "report" || action === "summary") {
      if (!serialNumber) {
        return NextResponse.json(
          { ok: false, error: `Missing serialNumber for ${action} action` },
          { status: 400 }
        )
      }
      const outputs: Record<string, string> = {}
      if (action === "score" && scoreJson !== undefined) outputs.score_json = scoreJson
      if (action === "report" && reportJson !== undefined) outputs.report_json = reportJson
      if (action === "summary" && summaryText !== undefined) outputs.summary_text = summaryText
      if (Object.keys(outputs).length === 0) {
        return NextResponse.json(
          { ok: false, error: `Missing payload for ${action} action` },
          { status: 400 }
        )
      }
      await updateUserOutputs(serialNumber, firstName, email, outputs)
    } else if (action === "telemetry") {
      if (!serialNumber) {
        return NextResponse.json(
          { ok: false, error: "Missing serialNumber for telemetry action" },
          { status: 400 }
        )
      }
      await updateUserTelemetry(serialNumber, firstName, email, {
        ph_session_id: phSessionId,
        ph_distinct_id: phDistinctId,
      })
    } else if (action === "purchase") {
      if (!serialNumber || !paidTier) {
        return NextResponse.json(
          { ok: false, error: "Missing serialNumber or paidTier for purchase action" },
          { status: 400 }
        )
      }
      await recordPurchase(serialNumber, firstName, email, {
        paid_tier: paidTier,
        paid_amount: paidAmount,
      })
    }
  } catch (e) {
    console.error("[sheets/append]", redactError(e))
    return NextResponse.json(
      { ok: false, error: "Failed to write to database" },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
