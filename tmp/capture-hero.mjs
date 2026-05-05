import { chromium } from 'playwright';

const URL = 'http://localhost:3000/';
const OUT_DIR = 'C:/Users/sahil/OneDrive/Documents/GitHub/scorecard-funnel/tmp';

async function shoot(viewport, outFile) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const el = document.querySelector('#hero');
    if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  await page.waitForTimeout(1500);
  const hero = await page.locator('#hero').first();
  await hero.screenshot({ path: outFile });
  await browser.close();
  console.log('wrote', outFile);
}

await shoot({ width: 1440, height: 900 }, `${OUT_DIR}/desktop-hero-fixed.png`);
await shoot({ width: 390, height: 844 }, `${OUT_DIR}/mobile-hero-fixed.png`);
