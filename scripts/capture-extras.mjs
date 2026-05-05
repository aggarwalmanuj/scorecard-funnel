import { chromium } from 'playwright';

const consoleErrors = [];

function attachLoggers(page, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${label}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleErrors.push(`[${label} pageerror] ${err.message}`));
}

(async () => {
  const browser = await chromium.launch();

  // ---------- Desktop ----------
  const dctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    reducedMotion: 'no-preference',
  });
  const dpage = await dctx.newPage();
  attachLoggers(dpage, 'desktop');
  await dpage.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
  await dpage.waitForTimeout(800);

  // 3) Desktop navbar scrolled (do this BEFORE scrolling to bottom)
  await dpage.evaluate(() => window.scrollTo(0, 0));
  await dpage.waitForTimeout(400);
  await dpage.evaluate(() => window.scrollBy(0, 200));
  await dpage.waitForTimeout(600);
  await dpage.screenshot({ path: 'tmp/desktop-nav-scrolled.png', fullPage: false });
  console.log('captured desktop-nav-scrolled');

  // 5) Desktop voices wall scrolled mid-row
  await dpage.evaluate(() => {
    const el = document.getElementById('voices');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await dpage.waitForTimeout(800);
  const scrolledOk = await dpage.evaluate(() => {
    const sec = document.getElementById('voices');
    if (!sec) return false;
    const row = sec.querySelector('div.flex.overflow-x-auto.snap-x');
    if (!row) return false;
    row.scrollLeft = 400;
    return true;
  });
  if (!scrolledOk) console.log('voices horizontal row not found');
  await dpage.waitForTimeout(500);
  const voicesEl = await dpage.$('#voices');
  if (voicesEl) {
    await voicesEl.screenshot({ path: 'tmp/desktop-voices-scrolled.png' });
    console.log('captured desktop-voices-scrolled');
  } else {
    console.log('missing #voices');
  }

  // 1) Desktop closing — scroll to bottom
  await dpage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await dpage.waitForTimeout(1500);
  await dpage.screenshot({ path: 'tmp/desktop-closing.png', fullPage: false });
  console.log('captured desktop-closing');

  await dctx.close();

  // ---------- Mobile ----------
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
  });
  const mpage = await mctx.newPage();
  attachLoggers(mpage, 'mobile');
  await mpage.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
  await mpage.waitForTimeout(800);

  // 4) Mobile navbar scrolled
  await mpage.evaluate(() => window.scrollTo(0, 0));
  await mpage.waitForTimeout(400);
  await mpage.evaluate(() => window.scrollBy(0, 200));
  await mpage.waitForTimeout(600);
  await mpage.screenshot({ path: 'tmp/mobile-nav-scrolled.png', fullPage: false });
  console.log('captured mobile-nav-scrolled');

  // 2) Mobile closing
  await mpage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await mpage.waitForTimeout(1500);
  await mpage.screenshot({ path: 'tmp/mobile-closing.png', fullPage: false });
  console.log('captured mobile-closing');

  await mctx.close();
  await browser.close();

  if (consoleErrors.length) {
    console.log('\n--- Console errors ---');
    for (const e of consoleErrors) console.log(e);
  } else {
    console.log('\nNo console errors.');
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
