import { redactError } from "@/lib/security"
import { z } from "zod"

const bodySchema = z.object({
  firstName: z.string().max(200).optional().default(""),
  beats: z.object({
    beat1: z.string().max(50000).optional().default(""),
    beat2: z.string().max(50000).optional().default(""),
    beat3: z.string().max(50000).optional().default(""),
    beat4: z.string().max(50000).optional().default(""),
    beat5: z.string().max(50000).optional().default(""),
  }),
})

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

function sseData(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`)
}

function buildSummaryPrompt(firstName: string, beats: z.infer<typeof bodySchema>["beats"]): { system: string; user: string } {
  const name = firstName.trim() || "you"

  const system = `You are a deeply perceptive guide who has just witnessed someone go through a profound journey of self-reflection. Your role is to craft a closing message that feels like a quiet revelation — not a summary, but a mirror held up at the right moment.

Your tone is: warm, direct, and unhurried. You do not use buzzwords, motivational language, or therapy-speak. You write in short, meaningful sentences. You trust silence. You never exaggerate.

The message should feel like it was written specifically for this person and this moment — because it was. It should land in the chest, not the head. It should leave them feeling seen, steady, and ready for the next step.

Structure: 3–4 paragraphs, no headers, no bullet points. The final paragraph should gently open the door to what comes next — not push, not sell. Just hold space for the possibility.

Length: 200–280 words. Economy is everything.`

  const user = `${name} just completed the Honest Decision Challenge. Here is what surfaced across their five beats of reflection:

Beat 1 — The Pattern:
${beats.beat1 || "(not available)"}

Beat 2 — The Desired Future:
${beats.beat2 || "(not available)"}

Beat 3 — The Noise:
${beats.beat3 || "(not available)"}

Beat 4 — The Breakthrough Moment:
${beats.beat4 || "(not available)"}

Beat 5 — The Morning After Clarity:
${beats.beat5 || "(not available)"}

Now write a closing message for ${name}. It should weave the essence of what surfaced — the pattern, the clarity, the courage it took to look. It should feel like a final word from someone who truly read every line.

Do not use their name more than once. Do not summarize each beat explicitly. Find the thread that runs through all five and name it quietly.`

  return { system, user }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const { firstName, beats } = parsed.data
  const { system, user } = buildSummaryPrompt(firstName, beats)

  const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini"
  const referer = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://localhost:3000"

  let upstream: Response
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": referer,
        "X-Title": "Honest Decision Challenge - Journey Summary",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: true,
        temperature: 0.72,
        max_tokens: 600,
      }),
    })
  } catch (e) {
    console.error("[summary] upstream fetch", redactError(e))
    return new Response(JSON.stringify({ error: "Upstream service error" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "")
    console.error("[summary] upstream status", upstream.status, errText.slice(0, 500))
    return new Response(
      JSON.stringify({ error: "Upstream service error", status: upstream.status }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sseBuffer = ""
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          sseBuffer += decoder.decode(value, { stream: true })
          let idx: number
          while ((idx = sseBuffer.indexOf("\n\n")) !== -1) {
            const block = sseBuffer.slice(0, idx)
            sseBuffer = sseBuffer.slice(idx + 2)
            for (const line of block.split("\n")) {
              const trimmed = line.trim()
              if (!trimmed.startsWith("data:")) continue
              const data = trimmed.slice(5).trim()
              if (data === "[DONE]") continue
              try {
                const j = JSON.parse(data) as {
                  choices?: Array<{ delta?: { content?: string } }>
                }
                const content = j.choices?.[0]?.delta?.content
                if (content) {
                  controller.enqueue(sseData({ c: content }))
                }
              } catch {
                /* ignore */
              }
            }
          }
        }
        // Flush trailing buffer
        const trailing = sseBuffer.trim()
        if (trailing) {
          for (const line of trailing.split("\n")) {
            const trimmed = line.trim()
            if (!trimmed.startsWith("data:")) continue
            const data = trimmed.slice(5).trim()
            if (data === "[DONE]") continue
            try {
              const j = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>
              }
              const content = j.choices?.[0]?.delta?.content
              if (content) {
                controller.enqueue(sseData({ c: content }))
              }
            } catch {
              /* ignore */
            }
          }
        }
      } catch (err) {
        // Client navigating away mid-stream surfaces here as ECONNRESET /
        // "aborted". That is expected, not a bug — swallow it so it does
        // not propagate as an uncaughtException at the Node level. Only
        // log genuinely unexpected upstream failures.
        const code = (err as { code?: string })?.code ?? ""
        const msg = err instanceof Error ? err.message : String(err)
        const isAbort =
          code === "ECONNRESET" ||
          code === "ABORT_ERR" ||
          /aborted|ECONNRESET|ERR_STREAM_PREMATURE_CLOSE/i.test(msg)
        if (!isAbort) console.error("[summary] stream error", redactError(err))
      } finally {
        try { controller.enqueue(sseData({ done: true })) } catch { /* already closed */ }
        try { controller.close() } catch { /* idempotent */ }
      }
    },
    cancel() {
      reader.cancel().catch(() => {})
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
