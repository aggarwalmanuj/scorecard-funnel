import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('tmp', { recursive: true });

const BASE = 'http://localhost:3000/';
const GDPR_SENTENCE =
  'Your responses are confidential and will never be shared with third parties';

(async () => {
  const browser = await chromium.launch();
  const report = {};

  // ===== 1. Desktop cookie banner =====
  const ctxDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await ctxDesktop.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tmp/desktop-cookie-banner.png' });
  await ctxDesktop.close();

  // ===== 2. Mobile cookie banner =====
  const ctxMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
    isMobile: true,
    hasTouch: true,
  });
  const mpage = await ctxMobile.newPage();
  await mpage.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
  await mpage.waitForTimeout(2000);
  await mpage.screenshot({ path: 'tmp/mobile-cookie-banner.png' });
  await ctxMobile.close();

  // ===== 3. Desktop closing section =====
  const ctxClosing = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const cpage = await ctxClosing.newPage();
  await cpage.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
  await cpage.waitForTimeout(800);

  // Scroll to last section before footer
  await cpage.evaluate(() => {
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
  await cpage.waitForTimeout(1500);

  const closingHandle = await cpage.evaluateHandle(() => {
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
  const closingEl = closingHandle.asElement();
  let closingText = '';
  if (closingEl) {
    await closingEl.screenshot({ path: 'tmp/desktop-closing-with-privacy.png' });
    closingText = (await closingEl.innerText()).trim();
  }
  report.closingText = closingText;
  report.closingHasGdpr = closingText
    .toLowerCase()
    .includes(GDPR_SENTENCE.toLowerCase());
  report.closingHasInConfidence = closingText
    .toLowerCase()
    .includes('in confidence');
  await ctxClosing.close();

  // ===== 4. Audience page =====
  const ctxAudience = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const apage = await ctxAudience.newPage();
  await apage.goto('http://localhost:3000/challenge/audience', {
    waitUntil: 'networkidle',
    timeout: 45000,
  });
  await apage.waitForTimeout(800);
  await apage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await apage.waitForTimeout(1000);
  await apage.screenshot({ path: 'tmp/audience-page-privacy.png' });
  const audienceText = (await apage.locator('body').innerText()).trim();
  report.audienceHasGdpr = audienceText
    .toLowerCase()
    .includes(GDPR_SENTENCE.toLowerCase());
  await ctxAudience.close();

  // ===== 5 & 6. Reject and reload =====
  const ctxReject = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const rpage = await ctxReject.newPage();
  await rpage.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
  await rpage.waitForTimeout(2000);

  // Find Reject button on cookie banner
  const rejectBtn = await rpage
    .locator('button', { hasText: /reject/i })
    .first();
  const rejectVisible = await rejectBtn.isVisible().catch(() => false);
  report.rejectButtonFound = rejectVisible;
  if (rejectVisible) {
    await rejectBtn.click();
    await rpage.waitForTimeout(700);
  }
  await rpage.screenshot({ path: 'tmp/cookie-banner-dismissed.png' });

  // Inspect localStorage flags
  const lsFlags = await rpage.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      out[k] = localStorage.getItem(k);
    }
    return out;
  });
  report.localStorageAfterReject = lsFlags;

  // Reload
  await rpage.reload({ waitUntil: 'networkidle', timeout: 45000 });
  await rpage.waitForTimeout(2000);
  await rpage.screenshot({ path: 'tmp/cookie-banner-suppressed.png' });

  // Detect if banner reappeared - look for a Reject/Accept button or cookie text
  const bannerStillVisible = await rpage
    .locator('button', { hasText: /reject/i })
    .first()
    .isVisible()
    .catch(() => false);
  report.bannerReappearedAfterReload = bannerStillVisible;

  await ctxReject.close();
  await browser.close();

  // Print report
  console.log('\n===== verify-gdpr report =====');
  console.log('Files created:');
  console.log('  tmp/desktop-cookie-banner.png');
  console.log('  tmp/mobile-cookie-banner.png');
  console.log('  tmp/desktop-closing-with-privacy.png');
  console.log('  tmp/audience-page-privacy.png');
  console.log('  tmp/cookie-banner-dismissed.png');
  console.log('  tmp/cookie-banner-suppressed.png');
  console.log('');
  console.log('Closing section text (truncated 600 chars):');
  console.log('---');
  console.log(report.closingText.slice(0, 600));
  console.log('---');
  console.log(`Closing contains GDPR sentence:   ${report.closingHasGdpr}`);
  console.log(`Closing still has "In confidence": ${report.closingHasInConfidence}`);
  console.log(`Audience contains GDPR sentence:   ${report.audienceHasGdpr}`);
  console.log(`Reject button found:               ${report.rejectButtonFound}`);
  console.log(
    `localStorage after reject:         ${JSON.stringify(report.localStorageAfterReject)}`
  );
  console.log(
    `Banner reappeared after reload:    ${report.bannerReappearedAfterReload}`
  );
})().catch((e) => {
  console.error('verify-gdpr failed:', e);
  process.exit(1);
});
