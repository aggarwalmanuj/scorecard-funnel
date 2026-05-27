import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { isCosmosConfigured, updateUserOutputs } from "@/lib/server/cosmos-db"
import { redactError } from "@/lib/security"

/**
 * POST /api/challenge/persist-summary-audio
 *
 * Persists the tester's generated summary MP3 so the admin can replay /
 * download exactly what the user heard. Audio is binary and far exceeds the
 * Cosmos 2 MB item limit, so the bytes go to Vercel Blob and only the public
 * URL is stored on the user document.
 *
 * The client (journey-summary screen) already holds the generated MP3 bytes,
 * so it forwards them here rather than triggering a second (paid) TTS render.
 *
 * Request: raw MP3 body, metadata in the query string:
 *   ?sno=<serialNumber>&name=<firstName>&email=<email>
 *   Content-Type: audio/mpeg
 *
 * Degrades gracefully: if Cosmos or BLOB_READ_WRITE_TOKEN isn't configured the
 * route returns 200 { skipped: true } so the funnel never breaks on a missing
 * integration.
 */

// Bytes. A 200-280 word summary at 128 kbps is ~1.5 MB; 6 MB is generous
// headroom while still rejecting obviously abusive uploads.
const MAX_AUDIO_BYTES = 6 * 1024 * 1024

/** Cheap MP3 sniff: ID3 tag, or an MPEG-audio frame-sync byte pattern. */
function looksLikeMp3(bytes: Uint8Array): boolean {
  if (bytes.length < 3) return false
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true // "ID3"
  // Frame sync: 11 set bits → 0xFF followed by 0xE0-0xFF.
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return true
  return false
}

export async function POST(request: Request) {
  if (!isCosmosConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "cosmos_not_configured" })
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // No Blob store wired up — skip silently. The admin will show "audio not
    // captured" for these users until the token is configured.
    return NextResponse.json({ ok: true, skipped: true, reason: "blob_not_configured" })
  }

  const url = new URL(request.url)
  const sno = parseInt(url.searchParams.get("sno") ?? "", 10)
  const firstName = (url.searchParams.get("name") ?? "").slice(0, 200)
  const email = (url.searchParams.get("email") ?? "").slice(0, 320)

  if (!Number.isInteger(sno) || sno <= 0) {
    return NextResponse.json({ ok: false, error: "Missing or invalid sno" }, { status: 400 })
  }
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Missing or invalid email" }, { status: 400 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.startsWith("audio/")) {
    return NextResponse.json({ ok: false, error: "Expected an audio body" }, { status: 415 })
  }

  let buf: ArrayBuffer
  try {
    buf = await request.arrayBuffer()
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read body" }, { status: 400 })
  }
  const bytes = new Uint8Array(buf)

  if (bytes.byteLength === 0) {
    return NextResponse.json({ ok: false, error: "Empty audio body" }, { status: 400 })
  }
  if (bytes.byteLength > MAX_AUDIO_BYTES) {
    return NextResponse.json({ ok: false, error: "Audio too large" }, { status: 413 })
  }
  if (!looksLikeMp3(bytes)) {
    return NextResponse.json({ ok: false, error: "Body is not an MP3" }, { status: 415 })
  }

  try {
    // Stable pathname keyed by serial number so a re-generation overwrites the
    // previous capture rather than accumulating orphaned blobs.
    const blob = await put(`summaries/summary-${sno}.mp3`, buf, {
      access: "public",
      contentType: "audio/mpeg",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    await updateUserOutputs(sno, firstName, email, { summary_audio_url: blob.url })
    return NextResponse.json({ ok: true, url: blob.url })
  } catch (e) {
    console.error("[persist-summary-audio]", redactError(e))
    return NextResponse.json({ ok: false, error: "Failed to persist audio" }, { status: 502 })
  }
}
