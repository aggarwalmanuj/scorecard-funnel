# Mobile-First Ship Checklist

**80–90% of traffic is mobile, and it's paid.** Every new page/component is built and reviewed at mobile widths **first**, desktop second. Run this list before opening a PR or shipping. Target audience skews older — err toward larger text and bigger tap targets.

## How to test (do this, don't skip)
- Chrome DevTools → device toolbar → check **360px, 390px, 414px, 430px** widths (iPhone SE → Pro Max, common Androids).
- Throttle to **Fast/Slow 4G** and check the fold + LCP image.
- Run **Lighthouse → Mobile** on each funnel entry page. **Definition of done: score > 90.**
- If possible, open on a real phone (iOS Safari + Android Chrome behave differently).

## 1. Layout & overflow
- [ ] **No horizontal scroll** at 360px. Test: `document.documentElement.scrollWidth <= window.innerWidth`.
- [ ] No fixed pixel widths that exceed the viewport (`w-[400px]`, big `min-w-*`, wide tables). Use `max-w-*` + `w-full`.
- [ ] `whitespace-nowrap` only on short labels — never on multi-word CTAs that can overflow a narrow screen.
- [ ] Grids collapse to 1 column on mobile: `grid-cols-1 sm:grid-cols-2 …` (never start multi-column).
- [ ] Flex rows that hold an input + button/select wrap or fit at 360px (e.g. the country-code phone field).
- [ ] Images use `next/image` with correct `sizes`, and `object-cover` (never let an image set the page width).
- [ ] Sticky headers/footers don't cover content or the active input on a short viewport.

## 2. Typography (older-reader friendly)
- [ ] Body copy **≥ 16px** on mobile for anything meant to be read (not just labels). Bump `text-[13px]/[14px]` reading text up.
- [ ] Line-height ≥ 1.6 on body; headings not so tight they clip descenders at small sizes.
- [ ] Fluid headline sizes with `clamp()` — the hero must not overflow at 360px.
- [ ] Contrast ≥ 4.5:1 for body, 3:1 for large text (Marine palette: `--ink` on `--background` passes; check `--foreground/55` faint text on images).
- [ ] Eyebrow/legal micro-copy is the *only* thing below 14px.

## 3. Tap targets & inputs
- [ ] Every interactive element is **≥ 44×44px** (buttons, links, icons, close/nav, the audio & download buttons). Add padding, don't shrink.
- [ ] Adjacent tap targets have spacing so fat fingers don't mis-hit.
- [ ] **Text inputs are ≥ 16px** (`text-base` on mobile) — smaller triggers iOS zoom-on-focus. `s-input` + `ui/input` already satisfy this; keep it.
- [ ] Inputs set the right `type` / `inputMode` (`email`, `tel`) so mobile shows the correct keyboard.
- [ ] Selects/dropdowns are reachable and not clipped; the chevron doesn't overlap the value.
- [ ] Forms are single-column on mobile; the primary CTA is full-width and thumb-reachable.

## 4. Performance (Lighthouse mobile > 90)
- [ ] LCP image (usually the hero) is optimized, `priority`, correctly sized, and reasonably compressed (< ~200KB).
- [ ] No layout shift (CLS): images/media have explicit dimensions or aspect-ratio boxes.
- [ ] Below-the-fold images lazy-load (default for `next/image` without `priority`).
- [ ] Heavy client JS is deferred; prefer server components. Third-party scripts (pixel, analytics) load async.
- [ ] Fonts use `display: swap` (already set for Inter/Fraunces).

## 5. Interaction & motion
- [ ] No hover-only affordances — everything works on tap (hover states are a bonus, not the path).
- [ ] `prefers-reduced-motion` respected; entrance animations don't block reading.
- [ ] Autoplay media is muted / user-initiated per policy; a manual control always exists.
- [ ] Modals/sheets: body scroll-locked, dismissible, and don't trap focus off-screen.

## 6. Funnel-specific
- [ ] Landing pages lead with the **free** CTA; **no pricing** above the fold or on the page; **"No credit card required"** sits directly under the primary CTA.
- [ ] The signup form (2-step) is comfortable at 360px: Step 1 fields stack, phone country-code + number fit on one row.
- [ ] Question/beat screens: the atmospheric image + copy + textarea all fit without the CTA being pushed off-screen.
- [ ] Offer/checkout tiers stack to 1 column; CTAs are full-width; trust logos wrap cleanly.

---
_Run every box before shipping. If a box can't be checked, it's not done — fix it or flag it in the PR._
