/**
 * Best-effort persistence of the final user-facing outputs (score, report,
 * summary text, summary audio) so the admin Responses panel can review and
 * download exactly what each tester received.
 *
 * All helpers are fire-and-forget: they never throw and never block the UI.
 * A failed persist just means the admin sees "not captured" for that field —
 * the user's experience is unaffected. Writes are idempotent server-side (a
 * re-sent value overwrites the same column), so retries on a later mount are
 * harmless.
 */

type Identity = {
  serialNumber: number | null
  firstName: string
  email: string
}

async function postAppend(body: Record<string, unknown>): Promise<void> {
  try {
    await fetch("/api/sheets/append", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch {
    /* best-effort — swallow */
  }
}

/** Persist the computed score record (clarity + reasons + nsState + source). */
export function persistScore(id: Identity, payload: unknown): void {
  if (!id.serialNumber || !id.email) return
  void postAppend({
    action: "score",
    serialNumber: id.serialNumber,
    firstName: id.firstName,
    email: id.email,
    scoreJson: safeStringify(payload, 20000),
  })
}

/** Persist the full /api/challenge/report payload. */
export function persistReport(id: Identity, payload: unknown): void {
  if (!id.serialNumber || !id.email) return
  void postAppend({
    action: "report",
    serialNumber: id.serialNumber,
    firstName: id.firstName,
    email: id.email,
    reportJson: safeStringify(payload, 120000),
  })
}

/** Persist the closing summary prose. */
export function persistSummaryText(id: Identity, text: string): void {
  if (!id.serialNumber || !id.email || !text.trim()) return
  void postAppend({
    action: "summary",
    serialNumber: id.serialNumber,
    firstName: id.firstName,
    email: id.email,
    summaryText: text.slice(0, 20000),
  })
}

/**
 * Persist the generated summary MP3 to Blob (server-side) by forwarding the
 * bytes the client already holds — no second TTS render. Silently no-ops when
 * the Blob store isn't configured.
 */
export function persistSummaryAudio(id: Identity, bytes: ArrayBuffer): void {
  if (!id.serialNumber || !id.email || !bytes.byteLength) return
  const params = new URLSearchParams({
    sno: String(id.serialNumber),
    name: id.firstName,
    email: id.email,
  })
  try {
    void fetch(`/api/challenge/persist-summary-audio?${params}`, {
      method: "POST",
      headers: { "Content-Type": "audio/mpeg" },
      body: bytes,
    })
  } catch {
    /* best-effort — swallow */
  }
}

function safeStringify(value: unknown, max: number): string {
  try {
    return JSON.stringify(value).slice(0, max)
  } catch {
    return ""
  }
}
