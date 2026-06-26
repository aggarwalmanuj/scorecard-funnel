// Fetch an image from the Pexels API and save it into /public.
// Usage: PEXELS_API_KEY=... node scripts/fetch-pexels.mjs "<query>" <outPath> [orientation] [index]
//   orientation: portrait | landscape | square (default portrait)
//   index: which result to take, 0-based (default 0)
// Prints the photographer + Pexels page URL so picks can be reviewed/credited.
import { writeFileSync } from "node:fs"

const KEY = process.env.PEXELS_API_KEY
if (!KEY) {
  console.error("Set PEXELS_API_KEY")
  process.exit(1)
}

const [query, outPath, orientation = "portrait", indexStr = "0"] =
  process.argv.slice(2)
if (!query || !outPath) {
  console.error('Usage: node scripts/fetch-pexels.mjs "<query>" <outPath> [orientation] [index]')
  process.exit(1)
}
const index = Number(indexStr)

const url =
  `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}` +
  `&per_page=10&orientation=${orientation}`
const res = await fetch(url, { headers: { Authorization: KEY } })
if (!res.ok) {
  console.error(`Pexels search failed: ${res.status} ${await res.text()}`)
  process.exit(1)
}
const data = await res.json()
const photos = data.photos ?? []
if (photos.length === 0) {
  console.error("No results for:", query)
  process.exit(1)
}

console.log(`Candidates for "${query}":`)
photos.forEach((p, i) =>
  console.log(`  [${i}] ${p.width}x${p.height} ${p.avg_color} by ${p.photographer} — ${p.url}`),
)

const photo = photos[index] ?? photos[0]
const imgUrl = photo.src.large2x || photo.src.original
const img = await fetch(imgUrl)
const buf = Buffer.from(await img.arrayBuffer())
writeFileSync(outPath, buf)
console.log(
  `\nSaved [${index}] -> ${outPath} (${(buf.length / 1024).toFixed(0)} KB)\n  ${photo.url}`,
)
