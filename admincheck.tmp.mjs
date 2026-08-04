import { chromium } from "playwright-core"
import fs from "node:fs"

const base = process.env.LOCALAPPDATA + "\\ms-playwright"
const dir = fs
  .readdirSync(base)
  .filter((d) => d.startsWith("chromium-") && !d.includes("headless"))
  .sort()
  .pop()
const exe = `${base}\\${dir}\\chrome-win64\\chrome.exe`

const browser = await chromium.launch({ executablePath: exe })
const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } })
page.on("console", (m) => {
  if (m.type() === "error") console.log("  console error:", m.text().slice(0, 200))
})

await page.goto("https://aimerge.live/admin", { waitUntil: "domcontentloaded" })
await page.waitForTimeout(2500)

// Password gate
const pw = page.locator('input[type="password"]').first()
if (await pw.isVisible().catch(() => false)) {
  await pw.fill("tester123")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(4000)
}
await page.screenshot({ path: "adminshots/00-after-login.png", fullPage: false })
console.log("title:", await page.title())
console.log("tabs:", (await page.locator("button, [role=tab]").allTextContents()).slice(0, 30).join(" | "))
await browser.close()
