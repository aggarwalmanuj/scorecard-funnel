import { redactError, sanitizeForPrompt } from "@/lib/security"
import { z } from "zod"
import {
  getSummarySystemPrompt,
  getSummaryUserPromptTemplate,
} from "@/lib/server/challenge-prompts"
import {
  DEFAULT_SUMMARY_SYSTEM_PROMPT,
  DEFAULT_SUMMARY_USER_PROMPT,
} from "@/lib/default-summary-prompt"

const bodySchema = z.object({
  firstName: z.string().max(200).optional().default(""),
  audience: z.enum(["individual", "team"]).optional().default("individual"),
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

function applySummaryUserTemplate(
  template: string,
  firstName: string,
  beats: z.infer<typeof bodySchema>["beats"]
): string {
  const name = sanitizeForPrompt(firstName.trim()) || "you"
  const blank = "(not available)"
  return template
    .replace(/\{\{NAME\}\}/g, name)
    .replace(/\{\{BEAT1\}\}/g, sanitizeForPrompt(beats.beat1 || blank))
    .replace(/\{\{BEAT2\}\}/g, sanitizeForPrompt(beats.beat2 || blank))
    .replace(/\{\{BEAT3\}\}/g, sanitizeForPrompt(beats.beat3 || blank))
    .replace(/\{\{BEAT4\}\}/g, sanitizeForPrompt(beats.beat4 || blank))
    .replace(/\{\{BEAT5\}\}/g, sanitizeForPrompt(beats.beat5 || blank))
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

  const { firstName, beats, audience } = parsed.data
  const [system, userTemplate] = await Promise.all([
    getSummarySystemPrompt(audience, DEFAULT_SUMMARY_SYSTEM_PROMPT),
    getSummaryUserPromptTemplate(audience, DEFAULT_SUMMARY_USER_PROMPT),
  ])
  const user = applySummaryUserTemplate(userTemplate, firstName, beats)

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
        // "aborted". That is expected, not a bug - swallow it so it does
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
