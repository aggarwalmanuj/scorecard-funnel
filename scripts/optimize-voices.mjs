/**
 * optimize-voices.mjs — re-encode the testimonial clips for the web.
 *
 * WHY THIS EXISTS
 * ---------------
 * The 12 testimonial clips on Vercel Blob (`Clip 1.mp4` … `Clip 12.mp4`) are
 * the reason the "Voices" wall is slow to play / appears not to play at all:
 *
 *   1. Each clip is ~60 MB (≈700 MB across all twelve). Way oversized.
 *   2. They are NOT "fast-start": the MP4 `moov` atom (the index the player
 *      needs before it can render a frame) sits at the END of the file, after
 *      ~60 MB of `mdat`. So the browser has to fetch deep into the file before
 *      playback can begin → the spinner spins for a long time.
 *
 * This script fixes BOTH: it downscales + recompresses each clip and writes it
 * with `-movflags +faststart` (moov moved to the front). Typical result is
 * ~3–6 MB per clip that starts playing almost immediately.
 *
 * The client-side player fix (muted-autoplay fallback in
 * components/video-testimonials-wall.tsx) makes the clips reliably *start*,
 * but only re-encoding the source files fixes the *slowness*. Run this, then
 * re-upload the optimized files to Blob under the SAME names so the existing
 * URLs keep working.
 *
 * PREREQUISITES
 * -------------
 *   - ffmpeg on PATH  (https://ffmpeg.org/download.html  /  `winget install Gyan.FFmpeg`)
 *   - Node 18+ (for global fetch)
 *
 * USAGE
 * -----
 *   # Download originals from Blob, optimize into tmp/voices-optimized/:
 *   node scripts/optimize-voices.mjs
 *
 *   # Or optimize local originals (named "Clip N.mp4") without downloading:
 *   VOICES_SRC_DIR=./my-originals node scripts/optimize-voices.mjs
 *
 * ENV / TUNABLES
 * --------------
 *   VOICES_BASE_URL   Blob base (default: the current production bucket)
 *   VOICES_SRC_DIR    Use local originals from this dir instead of downloading
 *   VOICES_OUT_DIR    Output dir (default: tmp/voices-optimized)
 *   VOICES_COUNT      Number of clips (default: 12)
 *   VOICES_MAX_HEIGHT Cap the long edge in px (default: 1280)
 *   VOICES_CRF        x264 quality, lower = better/bigger (default: 26)
 *
 * AFTER RUNNING — re-upload to Blob under the same paths so URLs are unchanged:
 *   • Vercel dashboard → Storage → your Blob store → upload, overwriting
 *     "Clip 1.mp4" … "Clip 12.mp4"; or
 *   • npm i -D @vercel/blob, then with BLOB_READ_WRITE_TOKEN set:
 *       import { put } from "@vercel/blob"
 *       await put("Clip 1.mp4", fileBuffer, {
 *         access: "public", contentType: "video/mp4", addRandomSuffix: false,
 *       })
 *     (addRandomSuffix:false keeps the existing pathname/URL.)
 */

import { spawnSync } from "node:child_process"
import { mkdirSync, existsSync, statSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const BASE_URL =
  process.env.VOICES_BASE_URL ||
  "https://bfyvfetxtgsgzjci.public.blob.vercel-storage.com"
const SRC_DIR = process.env.VOICES_SRC_DIR
  ? resolve(process.env.VOICES_SRC_DIR)
  : null
const OUT_DIR = resolve(process.env.VOICES_OUT_DIR || "tmp/voices-optimized")
const TMP_DIR = resolve("tmp/voices-src")
const COUNT = Number(process.env.VOICES_COUNT || 12)
const MAX_HEIGHT = Number(process.env.VOICES_MAX_HEIGHT || 1280)
const CRF = Number(process.env.VOICES_CRF || 26)

const mb = (bytes) => (bytes / 1_048_576).toFixed(1)

function ensureFfmpeg() {
  const probe = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" })
  if (probe.error || probe.status !== 0) {
    console.error(
      "ERROR: ffmpeg not found on PATH. Install it first:\n" +
        "  Windows:  winget install Gyan.FFmpeg\n" +
        "  macOS:    brew install ffmpeg\n" +
        "  Linux:    sudo apt install ffmpeg",
    )
    process.exit(1)
  }
}

async function fetchToFile(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  return buf.length
}

async function main() {
  ensureFfmpeg()
  mkdirSync(OUT_DIR, { recursive: true })
  if (!SRC_DIR) mkdirSync(TMP_DIR, { recursive: true })

  let totalBefore = 0
  let totalAfter = 0
  const failures = []

  for (let n = 1; n <= COUNT; n++) {
    const name = `Clip ${n}.mp4`
    const input = SRC_DIR ? join(SRC_DIR, name) : join(TMP_DIR, name)
    const output = join(OUT_DIR, name)

    try {
      if (SRC_DIR) {
        if (!existsSync(input)) throw new Error(`missing local source: ${input}`)
      } else {
        const url = `${BASE_URL}/${encodeURIComponent(name)}`
        process.stdout.write(`↓ downloading ${name} … `)
        const bytes = await fetchToFile(url, input)
        process.stdout.write(`${mb(bytes)} MB\n`)
      }

      const before = statSync(input).size
      totalBefore += before

      process.stdout.write(`⚙ encoding   ${name} … `)
      const ff = spawnSync(
        "ffmpeg",
        [
          "-y",
          "-i", input,
          // Cap the long edge at MAX_HEIGHT; keep aspect; force even dims (x264).
          "-vf", `scale='trunc(min(iw,iw*${MAX_HEIGHT}/ih)/2)*2':'trunc(min(ih,${MAX_HEIGHT})/2)*2'`,
          "-c:v", "libx264",
          "-profile:v", "high",
          "-preset", "veryfast",
          "-crf", String(CRF),
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-b:a", "128k",
          "-movflags", "+faststart", // ← moov atom to the FRONT (progressive play)
          output,
        ],
        { encoding: "utf8" },
      )
      if (ff.status !== 0) {
        throw new Error(
          `ffmpeg exited ${ff.status}\n${(ff.stderr || "").split("\n").slice(-6).join("\n")}`,
        )
      }

      const after = statSync(output).size
      totalAfter += after
      const pct = (100 - (after / before) * 100).toFixed(0)
      process.stdout.write(`${mb(before)} → ${mb(after)} MB (−${pct}%)\n`)
    } catch (err) {
      failures.push(name)
      process.stdout.write("\n")
      console.error(`✗ ${name}: ${err.message}`)
    }
  }

  console.log("\n──────────────────────────────────────────────")
  console.log(`Optimized files: ${OUT_DIR}`)
  if (totalBefore) {
    console.log(
      `Total: ${mb(totalBefore)} MB → ${mb(totalAfter)} MB ` +
        `(−${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}%)`,
    )
  }
  if (failures.length) {
    console.log(`Failed: ${failures.join(", ")}`)
  }
  console.log(
    "\nNext: re-upload the optimized clips to Blob under the SAME names\n" +
      '("Clip 1.mp4" … so existing URLs keep working). See the header of\n' +
      "this file for the dashboard / @vercel/blob upload steps.",
  )
  process.exit(failures.length ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
