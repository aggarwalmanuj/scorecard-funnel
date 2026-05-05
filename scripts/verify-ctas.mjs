import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('tmp', { recursive: true });

const BASE = 'http://localhost:3000/';

async function getHrefByText(scope, text) {
  const handles = await scope.$$('a');
  for (const h of handles) {
    const t = (await h.innerText().catch(() => '')).trim();
    if (t.toLowerCase().includes(text.toLowerCase())) {
      return await h.getAttribute('href');
    }
  }
  return null;
}

(async () => {
  const browser = await chromium.launch();
  const report = {};

  // ===== Desktop =====
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(800);

  // Part A: CTA hrefs
  // Header desktop CTA: first a.s-btn inside header
  const headerCta = await page.$('header a.s-btn');
  report.header = headerCta ? await headerCta.getAttribute('href') : null;

  // Hero CTA
  const heroSection = await page.$('#hero');
  report.hero = heroSection ? await getHrefByText(heroSection, 'Begin the reading') : null;

  // Sanctuary CTA
  const sanctuarySection = await page.$('#sanctuary');
  report.sanctuary = sanctuarySection ? await getHrefByText(sanctuarySection, 'Begin the reading') : null;

  // Dimensions CTA (#how-it-works)
  const dimSection = await page.$('#how-it-works');
  report.dimensions = dimSection ? await getHrefByText(dimSection, 'Begin the reading') : null;

  // Closing CTA: section before footer (search broadly, find the last <section>
  // appearing before the <footer> in document order)
  const closingHref = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    if (!footer) return null;
    const sections = Array.from(document.querySelectorAll('section'));
    // pick the section that comes last before the footer in document order
    let target = null;
    for (const s of sections) {
      const pos = s.compareDocumentPosition(footer);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) target = s;
    }
    if (!target) return null;
    // Find a link with text "Begin the reading" within
    const links = Array.from(target.querySelectorAll('a[href]'));
    const begin = links.find((a) =>
      (a.textContent || '').toLowerCase().includes('begin the reading')
    );
    return begin ? begin.getAttribute('href') : (links[0] ? links[0].getAttribute('href') : null);
  });
  report.closing = closingHref;

  // Inputs check
  const inputs = await page.$$('input');
  report.inputs = inputs.length;

  // Part B: hover screenshots
  // 4. Hover first nav link in header desktop
  const navLink = await page.$('header nav a');
  if (navLink) {
    const box = await navLink.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(300);
    }
  }
  const headerEl = await page.$('header');
  if (headerEl) {
    await headerEl.screenshot({ path: 'tmp/hover-nav-link.png' });
  }
  // move mouse away
  await page.mouse.move(0, 0);
  await page.waitForTimeout(150);

  // 5. Hover first voice testimonial card
  // scroll to voices
  await page.evaluate(() => {
    const v = document.getElementById('voices');
    if (v) v.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(600);
  const voicesSection = await page.$('#voices');
  let voiceCard = null;
  if (voicesSection) {
    voiceCard = await voicesSection.$('article, [data-voice-card], .voice-card, li, figure');
    if (!voiceCard) {
      // fallback: first descendant with role or a generic item
      const cards = await voicesSection.$$(':scope > * *');
      // pick something reasonable
    }
  }
  if (voiceCard) {
    const vb = await voiceCard.boundingBox();
    if (vb) {
      await page.mouse.move(vb.x + vb.width / 2, vb.y + vb.height / 2);
      await page.waitForTimeout(250);
    }
  }
  if (voicesSection) {
    await voicesSection.screenshot({ path: 'tmp/hover-voice-card.png' });
  }
  await page.mouse.move(0, 0);
  await page.waitForTimeout(150);

  // 6. Hero screenshot
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const hero = await page.$('#hero');
  if (hero) {
    await hero.screenshot({ path: 'tmp/desktop-hero-new.png' });
  }

  // 7. Closing screenshot (last section before footer in document order)
  await page.evaluate(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const sections = Array.from(document.querySelectorAll('section'));
    let target = null;
    for (const s of sections) {
      const pos = s.compareDocumentPosition(footer);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) target = s;
    }
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(600);
  const closingShot = await page.evaluateHandle(() => {
    const footer = document.querySelector('footer');
    if (!footer) return null;
    const sections = Array.from(document.querySelectorAll('section'));
    let target = null;
    for (const s of sections) {
      const pos = s.compareDocumentPosition(footer);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) target = s;
    }
    return target;
  });
  const closingEl = closingShot.asElement();
  if (closingEl) {
    await closingEl.screenshot({ path: 'tmp/desktop-closing-new.png' });
  }

  await ctx.close();

  // ===== Mobile =====
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
    isMobile: true,
    hasTouch: true,
  });
  const mpage = await mctx.newPage();
  await mpage.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
  await mpage.waitForTimeout(800);

  let mobileMenuHref = null;
  const openBtn = await mpage.$('button[aria-label="Open menu"]');
  if (openBtn) {
    await openBtn.click();
    await mpage.waitForTimeout(700);
    // find sheet/dialog container
    const sheet = (await mpage.$('[role="dialog"]')) || (await mpage.$('[data-state="open"]')) || mpage;
    mobileMenuHref = await getHrefByText(sheet, 'Begin the reading');
  }
  report.mobileMenu = mobileMenuHref;

  await mctx.close();
  await browser.close();

  // Print report
  const lines = [];
  lines.push('CTA hrefs found:');
  lines.push(`  header desktop:    ${report.header}`);
  lines.push(`  hero card:         ${report.hero}`);
  lines.push(`  sanctuary:         ${report.sanctuary}`);
  lines.push(`  dimensions:        ${report.dimensions}`);
  lines.push(`  closing:           ${report.closing}`);
  lines.push(`Inputs on landing:   ${report.inputs}`);
  lines.push(`Mobile menu CTA:     ${report.mobileMenu}`);
  lines.push('');
  lines.push('Screenshots saved:');
  lines.push('  tmp/hover-nav-link.png');
  lines.push('  tmp/hover-voice-card.png');
  lines.push('  tmp/desktop-hero-new.png');
  lines.push('  tmp/desktop-closing-new.png');
  console.log(lines.join('\n'));
})().catch((e) => {
  console.error('verify-ctas failed:', e);
  process.exit(1);
});
