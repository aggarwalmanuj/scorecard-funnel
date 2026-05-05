/**
 * One-shot script: pull a poster frame (~1s in) from each hosted
 * testimonial clip, resize to a 4:5 portrait WebP, and drop the result
 * in public/voices/posters/.
 *
 * Why static posters: <video preload="metadata"> is unreliable across
 * browsers and would saturate the 6-connection-per-host limit when the
 * page renders 12 cards at once. Pre-generated posters mean the cards
 * paint instantly with zero video bytes on initial load.
 *
 * Run: node scripts/generate-posters.mjs
 *
 * Deps (use --no-save so they don't pollute package.json):
 *   npm install --no-save ffmpeg-static sharp
 */
import ffmpegPath from "ffmpeg-static"
import { execFileSync } from "node:child_process"
import sharp from "sharp"
import fs from "node:fs"
import path from "node:path"

const baseUrl = "https://bfyvfetxtgsgzjci.public.blob.vercel-storage.com/Clip%20"
const total = 12
const outDir = "public/voices/posters"
fs.mkdirSync(outDir, { recursive: true })

for (let i = 1; i <= total; i++) {
  const url = `${baseUrl}${i}.mp4`
  const tmp = path.join(outDir, `_tmp_${i}.jpg`)
  const final = path.join(outDir, `voice-${String(i).padStart(2, "0")}.webp`)
  try {
    // -ss BEFORE -i = fast seek using HTTP range requests, ~1s in.
    execFileSync(
      ffmpegPath,
      ["-y", "-ss", "1", "-i", url, "-frames:v", "1", "-q:v", "2", tmp],
      { stdio: ["ignore", "ignore", "ignore"], timeout: 180_000 },
    )

    const buf = await sharp(tmp)
      .resize({ width: 600, height: 750, fit: "cover", position: "centre" })
      .webp({ quality: 78 })
      .toBuffer()
    fs.writeFileSync(final, buf)
    fs.unlinkSync(tmp)
    console.log(`✓ ${path.basename(final)} (${(buf.length / 1024) | 0} KB)`)
  } catch (e) {
    console.log(`✗ Clip ${i} FAILED: ${e.message.split("\n")[0]}`)
  }
}
