import { NextResponse } from "next/server"
import { z } from "zod"
import { isCosmosConfigured, appendSignupRow, updateQuestionCell, updateFeedbackCell, updateBeatOutputCell } from "@/lib/server/cosmos-db"
import { redactError } from "@/lib/security"

const bodySchema = z.object({
  action: z.enum(["signup", "answer", "feedback", "beat_output"]),
  firstName: z.preprocess(
    (v) => (v == null ? "" : String(v).trim().slice(0, 200)),
    z.string().max(200)
  ),
  email: z.preprocess(
    (v) => (v == null ? "" : String(v).trim().slice(0, 320)),
    z.string().max(320).email("Invalid email format")
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

  const { action, firstName, email, audience, serialNumber, questionNumber, answer, questionText, beatNumber, feedback, output } = parsed.data

  try {
    if (action === "signup") {
      // Always appends a new row, even for repeat emails. Returns the new S.No.
      const sno = await appendSignupRow(firstName, email, audience ?? "")
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
