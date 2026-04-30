import type { ChallengeState } from "@/context/challenge-context"

/** True when fetch/read was cancelled (navigation, Strict Mode remount, effect cleanup). */
export function isAbortErrorLike(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false
  const err = e as { name?: string; message?: string }
  if (err.name === "AbortError") return true
  if (typeof err.message === "string" && /abort/i.test(err.message)) return true
  return false
}

export type StreamBeatBody = {
  beatNumber: 1 | 2 | 3 | 4 | 5
  audience: "individual" | "team"
  firstName: string
  responses: ChallengeState["responses"]
  gate2Resonance?: "HIGH" | "MID" | "LOW"
  gate4Tone?: "LANDED" | "FAMILIAR" | "DISTANT"
}

/**
 * Consumes SSE from `/api/challenge/stream-beat` (chunks as `{ c: string }`, ends with `{ done: true }`).
 */
export async function streamBeatFromApi(
  body: StreamBeatBody,
  onDelta: (fullText: string) => void,
  signal?: AbortSignal
): Promise<{ ok: true } | { ok: false; error: string }> {
  let res: Response
  try {
    res = await fetch("/api/challenge/stream-beat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (isAbortErrorLike(e)) {
      return { ok: false, error: "aborted" }
    }
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return { ok: false, error: text || `HTTP ${res.status}` }
  }

  const reader = res.body?.getReader()
  if (!reader) {
    return { ok: false, error: "No response body" }
  }

  const decoder = new TextDecoder()
  let carry = ""
  let full = ""

  while (true) {
    let chunk: ReadableStreamReadResult<Uint8Array>
    try {
      chunk = await reader.read()
    } catch (e) {
      if (isAbortErrorLike(e)) {
        return { ok: false, error: "aborted" }
      }
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
    const { done, value } = chunk
    if (done) break
    carry += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = carry.indexOf("\n\n")) !== -1) {
      const block = carry.slice(0, idx)
      carry = carry.slice(idx + 2)
      for (const line of block.split("\n")) {
        if (!line.startsWith("data:")) continue
        const raw = line.slice(5).trim()
        try {
          const j = JSON.parse(raw) as { c?: string; done?: boolean }
          if (j.done) continue
          if (typeof j.c === "string") {
            full += j.c
            onDelta(full)
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  // Flush any trailing data left in the buffer after the stream ends.
  // The last chunk from the server may not end with \n\n.
  const trailing = carry.trim()
  if (trailing) {
    for (const line of trailing.split("\n")) {
      if (!line.startsWith("data:")) continue
      const raw = line.slice(5).trim()
      try {
        const j = JSON.parse(raw) as { c?: string; done?: boolean }
        if (j.done) continue
        if (typeof j.c === "string") {
          full += j.c
          onDelta(full)
        }
      } catch {
        /* ignore */
      }
    }
  }

  return { ok: true }
}
