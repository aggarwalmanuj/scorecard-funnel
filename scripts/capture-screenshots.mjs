import { chromium } from 'playwright';

const SECTIONS = ['hero', 'sanctuary', 'how-it-works', 'take-home', 'voices', 'guides', 'notes'];

const consoleErrors = [];

async function captureSections(page, label) {
  for (const id of SECTIONS) {
    await page.evaluate((sectionId) => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, id);
    await page.waitForTimeout(1500);
    const el = await page.$('#' + id);
    if (el) {
      await el.screenshot({ path: `tmp/${label}-${id}.png` });
      console.log(`captured ${label}-${id}`);
    } else {
      console.log(`missing ${label} section: ${id}`);
    }
  }
}

(async () => {
  const browser = await chromium.launch();

  // Desktop
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    reducedMotion: 'no-preference',
  });
  const page = await ctx.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[desktop] ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleErrors.push(`[desktop pageerror] ${err.message}`));
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);
  // Scroll back to top before full page capture
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tmp/landing-desktop-full.png', fullPage: true });
  await captureSections(page, 'desktop');
  await ctx.close();

  // Mobile
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
  });
  const mpage = await mctx.newPage();
  mpage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[mobile] ${msg.text()}`);
  });
  mpage.on('pageerror', (err) => consoleErrors.push(`[mobile pageerror] ${err.message}`));
  await mpage.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
  await mpage.waitForTimeout(800);
  await mpage.evaluate(() => window.scrollTo(0, 0));
  await mpage.waitForTimeout(400);
  await mpage.screenshot({ path: 'tmp/landing-mobile-full.png', fullPage: true });
  await captureSections(mpage, 'mobile');

  // Open mobile menu — return to top, then open
  try {
    await mpage.evaluate(() => window.scrollTo(0, 0));
    await mpage.waitForTimeout(300);
    const btn = await mpage.$('button[aria-label="Open menu"]');
    if (btn) {
      await btn.click();
      await mpage.waitForTimeout(700);
      await mpage.screenshot({ path: 'tmp/mobile-menu-open.png' });
      console.log('captured mobile-menu-open');
    } else {
      console.log('Open menu button not found');
    }
  } catch (e) {
    console.log('menu open failed: ' + e.message);
  }
  await mctx.close();

  // Tablet take-home
  const tctx = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
  });
  const tpage = await tctx.newPage();
  tpage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[tablet] ${msg.text()}`);
  });
  tpage.on('pageerror', (err) => consoleErrors.push(`[tablet pageerror] ${err.message}`));
  await tpage.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
  await tpage.waitForTimeout(800);
  await tpage.evaluate(() => {
    const el = document.getElementById('take-home');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await tpage.waitForTimeout(1500);
  const tEl = await tpage.$('#take-home');
  if (tEl) {
    await tEl.screenshot({ path: 'tmp/tablet-take-home.png' });
    console.log('captured tablet-take-home');
  } else {
    console.log('missing take-home on tablet');
  }
  await tctx.close();

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
