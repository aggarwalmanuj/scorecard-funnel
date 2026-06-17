"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Download, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useChallenge } from "@/context/challenge-context"
import type { ClarityScore } from "@/lib/scoring"
import { UPSELL_OFFERS, offerBookingUrl } from "@/lib/offers"

type Pillar = {
  key:
    | "directionClarity"
    | "identityAlignment"
    | "decisionReadiness"
    | "energyAlignment"
  narrative: string
  evidence: string
  focus: string
}

export type ReportData = {
  headline: string
  thread: string
  pillars: Pillar[]
  themes: { title: string; body: string }[]
  beats: { n: number; title: string; quote: string; reflection: string }[]
  takeaways: {
    title: string
    body: string
    urgency: "now" | "week" | "month"
  }[]
  thirtyDay: string
}

export type ApiResponse = {
  clarity: ClarityScore
  reasons: Partial<Record<Pillar["key"], string>>
  nsState?: string
  report: ReportData
  scoreSource: "llm" | "fallback"
}

const PILLAR_LABELS: Record<Pillar["key"], { label: string; pillar: string }> = {
  directionClarity: { label: "Direction Clarity", pillar: "Pillar I · Purpose" },
  identityAlignment: { label: "Identity Alignment", pillar: "Pillar II · Identity" },
  decisionReadiness: {
    label: "Decision Readiness",
    pillar: "Pillar III · Peace of Mind",
  },
  energyAlignment: {
    label: "Energy Alignment",
    pillar: "Pillar IV · Embodiment",
  },
}

function pillarColorTone(value: number): "purple" | "green" | "amber" | "coral" {
  if (value >= 70) return "green"
  if (value >= 55) return "purple"
  if (value >= 40) return "amber"
  return "coral"
}

function urgencyLabel(u: "now" | "week" | "month"): string {
  if (u === "now") return "This week"
  if (u === "week") return "Next 14 days"
  return "Within 30 days"
}

function urgencyTone(u: "now" | "week" | "month"): "purple" | "amber" | "green" {
  if (u === "now") return "amber"
  if (u === "week") return "purple"
  return "green"
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function reportId(seed: string): string {
  // Stable-ish short ID derived from name + date - display only.
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  return `CR-${stamp}-${(Math.abs(h) % 0xfff).toString(16).toUpperCase().padStart(3, "0")}`
}

/**
 * Rasterize every `.page` inside `root` and stitch them into an A4 PDF, then
 * trigger a download. Shared by the funnel report page and the admin panel so
 * both produce byte-identical PDFs from the same rendered markup. The PDF libs
 * (~400 KB) are dynamically imported so they only load on an actual download.
 */
export async function downloadReportPdf(
  root: HTMLElement,
  fileName: string
): Promise<void> {
  const [{ default: jsPDF }, html2canvasModule] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro"),
  ])
  const html2canvas = (
    html2canvasModule as { default: typeof import("html2canvas-pro").default }
  ).default

  const pageElements = root.querySelectorAll<HTMLElement>(".page")
  if (pageElements.length === 0) return

  const pdf = new jsPDF({ format: "a4", unit: "mm", orientation: "portrait" })
  const pageWidthMm = 210
  const pageHeightMm = 297

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i]
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    })
    const imgData = canvas.toDataURL("image/jpeg", 0.94)
    if (i > 0) pdf.addPage()
    const imgHeightMm = (canvas.height / canvas.width) * pageWidthMm
    const finalHeight = Math.min(imgHeightMm, pageHeightMm)
    pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, finalHeight)

    // html2canvas rasterizes the page to an image, so any <a> tags are no
    // longer clickable. Re-overlay real PDF link annotations for elements
    // tagged with `data-pdf-link`, mapping their on-screen box into mm. The
    // visible URL text underneath each link is the fallback if a viewer
    // ignores annotations.
    const pageRect = el.getBoundingClientRect()
    const mmPerPx = pageRect.width > 0 ? pageWidthMm / pageRect.width : 0
    if (mmPerPx > 0) {
      el.querySelectorAll<HTMLElement>("[data-pdf-link]").forEach((linkEl) => {
        const url = linkEl.getAttribute("data-pdf-link")
        if (!url) return
        const r = linkEl.getBoundingClientRect()
        const y = (r.top - pageRect.top) * mmPerPx
        if (y >= finalHeight) return // outside the clipped page area
        pdf.link(
          (r.left - pageRect.left) * mmPerPx,
          y,
          r.width * mmPerPx,
          r.height * mmPerPx,
          { url }
        )
      })
    }
  }

  pdf.save(fileName)
}

/** Slug a name for use in a download filename. */
export function reportFileSlug(name: string): string {
  return (
    (name || "your")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || "your"
  )
}

/**
 * Self-contained, prop-driven render of a report from an already-resolved
 * `/api/challenge/report` payload — no context, no fetching. Used by the admin
 * panel to render a persisted report and (via `downloadReportPdf`) export the
 * same PDF the user got.
 */
export function ReportView({
  data,
  name,
  dateISO,
  showOffers = true,
  audience,
}: {
  data: ApiResponse
  name: string
  dateISO?: string
  /** Include the "Go deeper" offers page (default true — admin previews the
   *  full Diagnostic-buyer report). */
  showOffers?: boolean
  audience?: string
}) {
  const today = dateISO ? new Date(dateISO) : new Date()
  const rid = useMemo(() => reportId(name || "report"), [name])
  return (
    <div className="report-root" data-palette="marine">
      <ReportStyles />
      <ReportPages
        name={name}
        today={today}
        rid={rid}
        clarity={data.clarity}
        reasons={data.reasons}
        nsState={data.nsState}
        report={data.report}
        showOffers={showOffers}
        audience={audience}
      />
    </div>
  )
}

export function ClarityReport() {
  const { state, isHydrated } = useChallenge()
  const reportRootRef = useRef<HTMLDivElement>(null)

  // The "go deeper" offers page is for Diagnostic-only buyers. Session /
  // Transformation buyers already bought the deeper tiers, so suppress it
  // when the report is opened with their tier in the URL. Default true so a
  // plain $47 (or unknown) download still gets the upsell.
  const [showOffers, setShowOffers] = useState(true)
  useEffect(() => {
    if (typeof window === "undefined") return
    const t = new URLSearchParams(window.location.search).get("tier")
    setShowOffers(t !== "session" && t !== "transformation")
  }, [])
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!isHydrated) return
    if (fetchedRef.current) return
    fetchedRef.current = true

    // Fast path: the processing screen pre-generates the report in the
    // background, so by the time the user clicks "Download report" the
    // payload is already in localStorage. Render it immediately - zero
    // network wait.
    if (state.reportData) {
      setData(state.reportData as unknown as ApiResponse)
      setLoading(false)
      setError(null)
      return
    }

    // Fallback path - only hit if the user reached the report page before
    // the background generation finished, or if the background call failed.
    const abort = new AbortController()
    setLoading(true)
    setError(null)

    fetch("/api/challenge/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: state.firstName,
        email: state.email,
        audience: state.audience ?? "individual",
        responses: state.responses,
        beats: state.beats,
        // Use the cached score so numbers match the summary page exactly.
        precomputedScore: state.clarityScore ?? undefined,
      }),
      signal: abort.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text().catch(() => "")
          throw new Error(text || `HTTP ${r.status}`)
        }
        return (await r.json()) as ApiResponse
      })
      .then((json) => setData(json))
      .catch((e) => {
        if (e?.name === "AbortError") return
        setError(e instanceof Error ? e.message : "Failed to generate report")
      })
      .finally(() => setLoading(false))

    return () => abort.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated])

  const today = useMemo(() => new Date(), [])
  const rid = useMemo(
    () => reportId(`${state.firstName}|${state.email}`),
    [state.firstName, state.email]
  )

  const [isDownloading, setIsDownloading] = useState(false)

  // Generate the PDF entirely client-side and trigger a real file download
  // - no print dialog, no second click. Each .page element on screen is
  // captured and added as one A4 page in the resulting PDF.
  const handleDownload = async () => {
    if (loading || error || !data) return
    if (isDownloading) return
    const root = reportRootRef.current
    if (!root) return
    setIsDownloading(true)
    try {
      await downloadReportPdf(
        root,
        `${reportFileSlug(state.firstName)}-belief-score-report.pdf`
      )
    } catch (e) {
      console.error("PDF download failed:", e)
    } finally {
      setIsDownloading(false)
    }
  }

  // Auto-trigger the download once the report is ready when the page was
  // opened with ?autosave=1 (set by the "Download report" button on
  // /challenge/offer). Runs once per mount.
  const autoSavedRef = useRef(false)
  useEffect(() => {
    if (autoSavedRef.current) return
    if (loading || error || !data) return
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("autosave") !== "1") return
    autoSavedRef.current = true
    const t = setTimeout(() => {
      void handleDownload()
    }, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, data])

  // Empty-state guard - no data captured locally.
  const hasContent =
    isHydrated &&
    !!(
      state.responses.question1 ||
      state.responses.question2 ||
      state.beats.beat1 ||
      state.beats.beat5
    )

  return (
    <div className="report-root" data-palette="marine" ref={reportRootRef}>
      <ReportStyles />

      {/* Top toolbar - hidden in print. Wordmark is omitted until the new
          logo arrives; the eyebrow on each page carries the section title. */}
      <div className="toolbar">
        <Link
          href={
            state.audience === "individual" || state.audience === "team"
              ? `/challenge/${state.audience}/offer`
              : "/challenge/audience"
          }
          className="back"
        >
          <ArrowLeft size={14} />
          Back to offer
        </Link>
        <div className="toolbar-title">
          <span className="brand-mark brand-mark-sm" aria-hidden />
          <span style={{ fontFamily: "var(--font-serif)", fontWeight: 400, letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 11, color: "var(--ink-soft)" }}>
            Belief Score Report
          </span>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading || !!error || !data || isDownloading}
          className="print-btn"
        >
          {isDownloading ? (
            <>
              <Loader2 size={14} style={{ animation: "report-spin 1s linear infinite" }} />
              Preparing…
            </>
          ) : (
            <>
              <Download size={14} />
              Download PDF
            </>
          )}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="status">
          <Loader2 className="spin" size={28} />
          <p className="status-title">Building your tailored report…</p>
          <p className="status-sub">
            Reading your five answers and five beats, scoring across the four
            pillars, and writing the synthesis. Usually 15-25 seconds.
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="status status-err">
          <AlertCircle size={28} />
          <p className="status-title">We couldn&apos;t generate the report.</p>
          <p className="status-sub">
            {error}. You can close this tab and try again from the offer page.
          </p>
        </div>
      )}

      {/* Empty state - user hit /challenge/report without going through the journey */}
      {!loading && !error && !hasContent && (
        <div className="status">
          <AlertCircle size={28} />
          <p className="status-title">Nothing to report on yet.</p>
          <p className="status-sub">
            Complete the Honest Decision Challenge first - your report is built
            from your answers.
          </p>
          <Link href="/" className="status-link">
            Start the challenge
          </Link>
        </div>
      )}

      {/* The report itself */}
      {!loading && !error && data && hasContent && (
        <ReportPages
          name={state.firstName}
          today={today}
          rid={rid}
          clarity={data.clarity}
          reasons={data.reasons}
          nsState={data.nsState}
          report={data.report}
          showOffers={showOffers}
          audience={state.audience ?? undefined}
        />
      )}
    </div>
  )
}

// ─────────────────────────── pages ───────────────────────────

function ReportPages({
  name,
  today,
  rid,
  clarity,
  reasons,
  nsState,
  report,
  showOffers = false,
  audience,
}: {
  name: string
  today: Date
  rid: string
  clarity: ClarityScore
  reasons: Partial<Record<Pillar["key"], string>>
  nsState?: string
  report: ReportData
  /** Append the "Go deeper" upsell page (for Diagnostic-only buyers). */
  showOffers?: boolean
  audience?: string
}) {
  const subBy = useMemo(() => {
    const map = new Map<Pillar["key"], number>()
    clarity.subscoreDetails.forEach((s) => map.set(s.key, s.value))
    return map
  }, [clarity])

  const totalPages = showOffers ? 5 : 4

  return (
    <>
      {/* Page 1 - Cover + scores */}
      <section className="page">
        <ReportHeader name={name} today={today} rid={rid} />

        <div className="eyebrow">Your Journey, Reflected</div>
        <h1 className="title">
          {name ? `${name}, ` : ""}
          {report.headline}
        </h1>
        <p className="lede">{report.thread}</p>

        {/* Hero score card */}
        <div className="hero">
          <div className="donut-wrap">
            <ScoreDonut value={clarity.overall} />
          </div>
          <div className="hero-info">
            <span className="band-pill">
              <span className="led" /> {clarity.bandLabel}
              {nsState && nsState !== "UNKNOWN" ? ` · ${nsState}` : ""}
            </span>
            <div className="hero-title">{clarity.bandMessage}</div>
            <p className="hero-sub">{clarity.comparisonLabel}</p>
          </div>
        </div>

        <h2>The four pillars</h2>
        <div className="sub-grid">
          {clarity.subscoreDetails.map((s) => (
            <SubscoreCard
              key={s.key}
              label={s.label}
              pillar={s.pillar}
              value={s.value}
              reason={reasons[s.key]}
            />
          ))}
        </div>

        <ReportFooter page={1} of={totalPages} name={name} />
      </section>

      {/* Page 2 - Per-pillar deep dive */}
      <section className="page">
        <ReportHeader name={name} today={today} rid={rid} compact />

        <div className="eyebrow">Pillar deep-dive</div>
        <h1 className="title small">What each score actually means for you</h1>

        <div className="pillar-stack">
          {report.pillars.map((p) => {
            const value = subBy.get(p.key) ?? 0
            const meta = PILLAR_LABELS[p.key]
            return (
              <PillarBlock
                key={p.key}
                title={meta.label}
                pillar={meta.pillar}
                value={value}
                narrative={p.narrative}
                evidence={p.evidence}
                focus={p.focus}
              />
            )
          })}
        </div>

        <ReportFooter page={2} of={totalPages} name={name} />
      </section>

      {/* Page 3 - Benchmark + themes + beats */}
      <section className="page">
        <ReportHeader name={name} today={today} rid={rid} compact />

        <div className="eyebrow">Where you stand</div>
        <h1 className="title small">Peer benchmark &amp; the threads we found</h1>

        <BenchmarkBlock overall={clarity.overall} mean={clarity.benchmarkMean} />

        <h2 style={{ marginTop: 22 }}>What surfaced</h2>
        <div className="theme-stack">
          {report.themes.map((t, i) => (
            <div key={i} className="theme">
              <div className="theme-num">{String(i + 1).padStart(2, "0")}</div>
              <div>
                <h4>{t.title}</h4>
                <p>{t.body}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 22 }}>The five beats, reflected back</h2>
        <div className="beats">
          {report.beats
            .slice()
            .sort((a, b) => a.n - b.n)
            .map((b) => (
              <div key={b.n} className="beat">
                <div className="n">{b.n}</div>
                <div>
                  <h4>{b.title}</h4>
                  <blockquote>{b.quote}</blockquote>
                  <p>{b.reflection}</p>
                </div>
              </div>
            ))}
        </div>

        <ReportFooter page={3} of={totalPages} name={name} />
      </section>

      {/* Page 4 - Takeaways + 30-day */}
      <section className="page">
        <ReportHeader name={name} today={today} rid={rid} compact />

        <div className="eyebrow">What now</div>
        <h1 className="title small">Concrete moves, ordered by urgency</h1>
        <p className="lede" style={{ marginBottom: 14 }}>
          Each move is specific to what you wrote - not generic advice. Pick
          one. Doing one well beats doing four halfway.
        </p>

        <div className="take-stack">
          {report.takeaways.map((t, i) => (
            <TakeawayBlock
              key={i}
              n={i + 1}
              title={t.title}
              body={t.body}
              urgency={t.urgency}
            />
          ))}
        </div>

        <div className="thirty">
          <div className="eyebrow">30 days from now</div>
          <p>{report.thirtyDay}</p>
        </div>

        <ReportFooter page={4} of={totalPages} name={name} />
      </section>

      {/* Page 5 (Diagnostic buyers only) - the two "go deeper" offers. Each
          card is an <a> tagged data-pdf-link so downloadReportPdf overlays a
          real clickable annotation over the rasterized page; the visible URL
          beneath is the fallback for viewers that ignore annotations. */}
      {showOffers && (
        <section className="page">
          <ReportHeader name={name} today={today} rid={rid} compact />

          <div className="eyebrow">Go deeper</div>
          <h1 className="title small">Two ways to move what you just saw</h1>
          <p className="lede" style={{ marginBottom: 18 }}>
            Your report names the pattern. These take it further — from seeing
            it, to moving it, to making the shift part of how you operate.
          </p>

          <div style={{ display: "grid", gap: 16 }}>
            {UPSELL_OFFERS.map((offer) => {
              const url = offerBookingUrl(offer.id, audience)
              return (
                <a
                  key={offer.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-pdf-link={url}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    color: "var(--ink)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "18px 20px",
                    background: "var(--surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 18,
                        fontWeight: 500,
                      }}
                    >
                      {offer.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 20,
                        color: "var(--brand-dark)",
                      }}
                    >
                      ${offer.price}
                    </span>
                  </div>
                  <p
                    style={{
                      fontStyle: "italic",
                      color: "var(--ink-soft)",
                      margin: "4px 0 10px",
                      fontSize: 13.5,
                    }}
                  >
                    {offer.tagline}
                  </p>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: "0 0 12px",
                      display: "grid",
                      gap: 5,
                    }}
                  >
                    {offer.bullets.map((b, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 12.5,
                          color: "var(--ink-soft)",
                          paddingLeft: 14,
                          position: "relative",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            left: 0,
                            color: "var(--brand)",
                          }}
                        >
                          ·
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--brand-dark)",
                      fontWeight: 600,
                    }}
                  >
                    {offer.id === "session"
                      ? "Book your session"
                      : "Begin the transformation"}{" "}
                    →
                  </span>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 10,
                      color: "var(--muted)",
                      wordBreak: "break-all",
                    }}
                  >
                    {url}
                  </div>
                </a>
              )
            })}
          </div>

          <ReportFooter page={5} of={totalPages} name={name} />
        </section>
      )}
    </>
  )
}

// ─────────────────────────── pieces ───────────────────────────

function ReportHeader({
  name,
  today,
  rid,
  compact,
}: {
  name: string
  today: Date
  rid: string
  compact?: boolean
}) {
  return (
    <header className="head">
      {/* AIMerge wordmark + report eyebrow. The .brand-mark mask inherits
          the page's --ink (navy on the report's cream surface) so it stays
          legible; html2canvas-pro renders CSS mask correctly into the PDF. */}
      <div className="logo">
        <span className="brand-mark brand-mark-sm" aria-hidden />
        <span className="report-name">Belief Score Report</span>
      </div>
      {compact ? (
        <div className="meta">
          <b>{name || "Your report"}</b> · {formatDate(today)}
        </div>
      ) : (
        <div className="meta">
          <b>{name || "Your report"}</b>
          <br />
          {formatDate(today)}
          <br />
          Report ID · {rid}
        </div>
      )}
    </header>
  )
}

function ReportFooter({
  page,
  of,
  name,
}: {
  page: number
  of: number
  name: string
}) {
  return (
    <div className="foot">
      <span>
        Belief Score Report · Page {page} of {of}
      </span>
      <span>Confidential · prepared for {name || "you"}</span>
    </div>
  )
}

function ScoreDonut({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value))
  const r = 48
  const c = 2 * Math.PI * r // ~301.59
  const dash = (c * v) / 100
  const gap = c - dash
  return (
    <svg
      className="donut"
      viewBox="0 0 120 120"
      aria-label={`Overall Belief Score ${v} of 100`}
    >
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a8f9e" />
          <stop offset="100%" stopColor="#1f6b78" />
        </linearGradient>
      </defs>
      <circle className="ring-bg" cx="60" cy="60" r={r} />
      <circle
        className="ring-fg"
        cx="60"
        cy="60"
        r={r}
        strokeDasharray={`${dash.toFixed(2)} ${gap.toFixed(2)}`}
      />
      <text className="score" x="60" y="72" textAnchor="middle">
        {v}
      </text>
    </svg>
  )
}

function SubscoreCard({
  label,
  pillar,
  value,
  reason,
}: {
  label: string
  pillar: string
  value: number
  reason?: string
}) {
  const tone = pillarColorTone(value)
  return (
    <div className="sub">
      <div className="sub-head">
        <div>
          <div className="sub-label">{label}</div>
          <div className="sub-pillar">{pillar}</div>
        </div>
        <div className={`sub-value c-${tone}`}>{value}</div>
      </div>
      <div className="sub-bar">
        <div className={`b-${tone}`} style={{ width: `${value}%` }} />
      </div>
      {reason ? <p className="sub-reason">{reason}</p> : null}
    </div>
  )
}

function PillarBlock({
  title,
  pillar,
  value,
  narrative,
  evidence,
  focus,
}: {
  title: string
  pillar: string
  value: number
  narrative: string
  evidence: string
  focus: string
}) {
  const tone = pillarColorTone(value)
  return (
    <div className="pillar">
      <div className="pillar-top">
        <div>
          <div className="pillar-label">{title}</div>
          <div className="pillar-sub">{pillar}</div>
        </div>
        <div className={`pillar-num c-${tone}`}>
          {value}
          <small>/100</small>
        </div>
      </div>
      <div className="sub-bar" style={{ marginTop: 4 }}>
        <div className={`b-${tone}`} style={{ width: `${value}%` }} />
      </div>
      <p className="pillar-narrative">{narrative}</p>
      {evidence ? (
        <div className="pillar-evidence">
          <span className="ev-tag">In your words</span>
          <span className="ev-quote">&ldquo;{evidence}&rdquo;</span>
        </div>
      ) : null}
      <div className="pillar-focus">
        <span className="ev-tag focus-tag">Focus</span>
        <span>{focus}</span>
      </div>
    </div>
  )
}

function BenchmarkBlock({ overall, mean }: { overall: number; mean: number }) {
  const youPos = Math.max(2, Math.min(98, overall))
  const meanPos = Math.max(2, Math.min(98, mean))
  const delta = overall - mean
  const deltaText =
    delta > 0
      ? `+${delta} above the peer mean`
      : delta < 0
      ? `${delta} below the peer mean`
      : "exactly at the peer mean"
  return (
    <div className="bench">
      <div className="bench-head">
        <div>
          <h3>Overall Belief Score</h3>
          <small>Peer set · leaders carrying unresolved clarity gaps</small>
        </div>
        <div className="bench-num">
          <span className="c-purple">{overall}</span>
          <small> · you</small>
          &nbsp;·&nbsp;
          <span className="c-ink-soft">{mean}</span>
          <small> · avg</small>
        </div>
      </div>
      <div className="bench-bar">
        <div className="fill" style={{ width: `${youPos}%` }} />
        <div className="marker" style={{ left: `${meanPos}%` }} />
        <div className="marker-label" style={{ left: `${meanPos}%` }}>
          avg {mean}
        </div>
        <div className="you-label" style={{ left: `${youPos}%` }}>
          you {overall}
        </div>
      </div>
      <p className="bench-note">
        You score <b>{deltaText}</b>. The pillar with the most leverage to lift
        your overall score is the one with the lowest reading on page 1.
      </p>
    </div>
  )
}

function TakeawayBlock({
  n,
  title,
  body,
  urgency,
}: {
  n: number
  title: string
  body: string
  urgency: "now" | "week" | "month"
}) {
  const tone = urgencyTone(urgency)
  return (
    <div className="take">
      <div className={`take-num c-${tone}`}>{String(n).padStart(2, "0")}</div>
      <div className="take-body">
        <div className="take-head-row">
          <h4>{title}</h4>
          <span className={`urg-pill u-${tone}`}>{urgencyLabel(urgency)}</span>
        </div>
        <p>{body}</p>
      </div>
    </div>
  )
}

// ─────────────────────────── styles ───────────────────────────

function ReportStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        html,
        body {
          background: #ffffff !important;
        }
        .toolbar,
        .status {
          display: none !important;
        }
        .page {
          box-shadow: none !important;
          margin: 0 !important;
          page-break-after: always;
        }
        .page:last-child {
          page-break-after: auto;
        }
      }

      /* Marine-family palette - printable cream paper with navy ink and
         teal signal. Mirrors the rest of the funnel's Marine lock so the
         downloaded PDF feels continuous with the on-screen experience. */
      .report-root {
        --ink: #0f2c3b;
        --ink-soft: #3e5b6a;
        --muted: #87a3b1;
        --line: #d6e0e7;
        --bg: #ffffff;
        --surface: #f6f9fb;
        --brand: #2a8f9e;
        --brand-dark: #1f6b78;
        --brand-soft: #e1edf1;
        --green: #4f9e7a;
        --amber: #c08a2a;
        --coral: #c25c4d;
        --lilac: #9bc8d8;
        background: #eaf0f4;
        color: var(--ink);
        font-family: var(--font-serif), Georgia, "Times New Roman", serif;
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
      }
      /* Toolbar + UI chrome stays in the modern sans so the controls don't
         feel like part of the editorial body. */
      .report-root .toolbar,
      .report-root .toolbar *,
      .report-root .status,
      .report-root .status * {
        font-family: var(--font-sans), -apple-system, BlinkMacSystemFont,
          "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }

      .report-root .toolbar {
        position: sticky;
        top: 0;
        z-index: 50;
        background: #ffffff;
        border-bottom: 1px solid var(--line);
        padding: 10px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        gap: 12px;
      }
      .report-root .toolbar-title {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        color: var(--ink);
      }
      .report-root .toolbar-title .dot {
        width: 12px;
        height: 12px;
        border-radius: 4px;
        background: linear-gradient(135deg, var(--brand), var(--brand-dark));
      }
      .report-root .brand-img {
        height: 22px;
        width: auto;
        display: block;
        /* Force browsers to print background graphics + this raster at full
           fidelity. Without -webkit-print-color-adjust some Chromium builds
           strip transparency / drop the image when generating the PDF. */
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .report-root .head .brand-img {
        height: 18px;
      }
      .report-root .back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--ink-soft);
        text-decoration: none;
        font-weight: 600;
      }
      .report-root .back:hover {
        color: var(--brand-dark);
      }
      .report-root .print-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--brand);
        color: #fff;
        border: 0;
        padding: 9px 16px;
        border-radius: 9px;
        font-weight: 700;
        cursor: pointer;
        font-size: 13px;
      }
      .report-root .print-btn:hover {
        background: var(--brand-dark);
      }
      .report-root .print-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .report-root .status {
        max-width: 620px;
        margin: 60px auto;
        padding: 36px 28px;
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 12px 40px rgba(15, 44, 59, 0.12);
        text-align: center;
        color: var(--ink-soft);
      }
      .report-root .status .spin {
        animation: report-spin 1s linear infinite;
        color: var(--brand);
      }
      .report-root .status-err {
        color: var(--coral);
      }
      .report-root .status-title {
        margin: 14px 0 6px;
        font-weight: 800;
        font-size: 17px;
        color: var(--ink);
      }
      .report-root .status-sub {
        font-size: 13px;
        line-height: 1.6;
      }
      .report-root .status-link {
        display: inline-block;
        margin-top: 12px;
        color: var(--brand-dark);
        font-weight: 700;
        text-decoration: none;
      }
      @keyframes report-spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* ───── Page ───── */
      .report-root .page {
        width: 210mm;
        min-height: 297mm;
        margin: 24px auto;
        padding: 22mm 20mm 20mm;
        background: var(--bg);
        box-shadow: 0 12px 40px rgba(15, 44, 59, 0.12);
        position: relative;
        overflow: hidden;
        color: var(--ink);
      }
      .report-root .page::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(
          90deg,
          var(--brand),
          var(--lilac),
          var(--brand)
        );
      }

      /* ───── Typography ───── */
      .report-root .eyebrow {
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--brand);
      }
      .report-root .title {
        font-size: 30px;
        line-height: 1.1;
        margin: 6px 0 6px;
        letter-spacing: -0.02em;
        font-weight: 800;
      }
      .report-root .title.small {
        font-size: 22px;
      }
      .report-root .lede {
        font-size: 12.5px;
        line-height: 1.7;
        color: var(--ink-soft);
        margin: 0 0 12px;
        max-width: 78ch;
      }
      .report-root h2 {
        font-size: 16px;
        margin: 14px 0 10px;
        letter-spacing: -0.01em;
        font-weight: 800;
        color: var(--ink);
      }
      .report-root h3 {
        font-size: 12.5px;
        margin: 0 0 6px;
        letter-spacing: 0.02em;
        font-weight: 700;
        color: var(--ink-soft);
      }
      .report-root p {
        font-size: 12px;
        line-height: 1.65;
        color: var(--ink-soft);
        margin: 0 0 8px;
      }
      .report-root small {
        color: var(--muted);
        font-size: 10.5px;
      }
      .report-root .c-purple {
        color: var(--brand);
      }
      .report-root .c-green {
        color: var(--green);
      }
      .report-root .c-amber {
        color: var(--amber);
      }
      .report-root .c-coral {
        color: var(--coral);
      }
      .report-root .c-ink-soft {
        color: var(--ink-soft);
      }
      .report-root .b-purple {
        background: linear-gradient(90deg, var(--brand), var(--lilac));
      }
      .report-root .b-green {
        background: linear-gradient(90deg, #059669, var(--green));
      }
      .report-root .b-amber {
        background: linear-gradient(90deg, #d97706, var(--amber));
      }
      .report-root .b-coral {
        background: linear-gradient(90deg, #dc2626, var(--coral));
      }

      /* ───── Header / footer ───── */
      .report-root .head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 14px;
      }
      .report-root .head .meta {
        font-size: 10.5px;
        color: var(--muted);
        text-align: right;
        line-height: 1.55;
      }
      .report-root .head .meta b {
        color: var(--ink);
        font-weight: 700;
      }
      .report-root .logo {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-weight: 800;
        letter-spacing: -0.01em;
        color: var(--ink);
        font-size: 13px;
      }
      .report-root .logo .brand-mark {
        width: 96px;
      }
      .report-root .logo .report-name {
        padding-left: 10px;
        border-left: 1px solid var(--line);
        font-size: 9.5px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--ink-soft);
      }
      .report-root .foot {
        position: absolute;
        left: 20mm;
        right: 20mm;
        bottom: 12mm;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 9.5px;
        color: var(--muted);
        letter-spacing: 0.04em;
        border-top: 1px solid var(--line);
        padding-top: 8px;
      }

      /* ───── Hero / score donut ───── */
      .report-root .hero {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 28px;
        padding: 22px 24px;
        background: linear-gradient(
          160deg,
          rgba(255, 255, 255, 0.55) 0%,
          rgba(239, 234, 255, 0.35) 100%
        );
        backdrop-filter: blur(18px) saturate(180%);
        -webkit-backdrop-filter: blur(18px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.65);
        border-radius: 16px;
        margin: 6px 0 16px;
        box-shadow:
          0 8px 32px rgba(42, 143, 158, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.7);
      }
      .report-root .donut-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .report-root .donut {
        width: 200px;
        height: 200px;
      }
      .report-root .donut .ring-bg {
        fill: none;
        stroke: #e1edf1;
        stroke-width: 16;
      }
      .report-root .donut .ring-fg {
        fill: none;
        stroke: url(#ringGrad);
        stroke-width: 16;
        stroke-linecap: round;
        transform: rotate(-90deg);
        transform-origin: 50% 50%;
      }
      .report-root .donut .score {
        fill: var(--ink);
        font-size: 38px;
        font-weight: 800;
        letter-spacing: -0.03em;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          "Helvetica Neue", Arial, sans-serif;
      }
      .report-root .hero-info {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .report-root .band-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 11px;
        border-radius: 999px;
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        background: rgba(42, 143, 158, 0.12);
        color: var(--brand-dark);
        border: 1px solid rgba(42, 143, 158, 0.3);
        align-self: flex-start;
      }
      .report-root .band-pill .led {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--brand);
      }
      .report-root .hero-title {
        font-size: 19px;
        font-weight: 800;
        margin: 10px 0 6px;
        letter-spacing: -0.015em;
        color: var(--ink);
        line-height: 1.25;
      }
      .report-root .hero-sub {
        font-size: 12.5px;
        color: var(--ink-soft);
        line-height: 1.6;
        margin: 0;
      }

      /* ───── Subscore card grid ───── */
      .report-root .sub-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 18px;
      }
      .report-root .sub {
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 13px 15px;
        background: #fff;
      }
      .report-root .sub-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .report-root .sub-label {
        font-size: 12.5px;
        font-weight: 700;
        color: var(--ink);
      }
      .report-root .sub-pillar {
        font-size: 9.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .report-root .sub-value {
        font-size: 18px;
        font-weight: 800;
      }
      .report-root .sub-bar {
        height: 6px;
        background: #e8f0f3;
        border-radius: 999px;
        overflow: hidden;
        margin-top: 4px;
      }
      .report-root .sub-bar > div {
        height: 100%;
        border-radius: 999px;
      }
      .report-root .sub-reason {
        font-size: 11px;
        color: var(--ink-soft);
        line-height: 1.55;
        margin: 8px 0 0;
      }

      /* ───── Pillar deep-dive ───── */
      .report-root .pillar-stack {
        display: grid;
        gap: 14px;
      }
      .report-root .pillar {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 16px 18px;
        background: #fff;
      }
      .report-root .pillar-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .report-root .pillar-label {
        font-size: 14px;
        font-weight: 800;
        color: var(--ink);
      }
      .report-root .pillar-sub {
        font-size: 9.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted);
        margin-top: 2px;
      }
      .report-root .pillar-num {
        font-size: 24px;
        font-weight: 800;
        line-height: 1;
      }
      .report-root .pillar-num small {
        font-size: 11px;
        font-weight: 600;
        color: var(--muted);
        margin-left: 2px;
      }
      .report-root .pillar-narrative {
        margin-top: 10px;
        font-size: 12px;
        line-height: 1.7;
        color: var(--ink-soft);
      }
      .report-root .pillar-evidence,
      .report-root .pillar-focus {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--surface);
        border: 1px solid var(--line);
        margin-top: 8px;
        font-size: 11.5px;
        color: var(--ink);
        line-height: 1.55;
      }
      .report-root .ev-tag {
        flex-shrink: 0;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brand-dark);
        background: rgba(42, 143, 158, 0.12);
        border: 1px solid rgba(42, 143, 158, 0.25);
        padding: 3px 7px;
        border-radius: 6px;
      }
      .report-root .focus-tag {
        color: #b46408;
        background: rgba(245, 158, 11, 0.12);
        border-color: rgba(245, 158, 11, 0.3);
      }
      .report-root .ev-quote {
        font-style: italic;
        color: var(--ink-soft);
      }

      /* ───── Benchmark ───── */
      .report-root .bench {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 18px 20px;
        background: var(--surface);
        margin: 6px 0 6px;
      }
      .report-root .bench-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .report-root .bench-num {
        font-size: 20px;
        font-weight: 800;
      }
      .report-root .bench-bar {
        position: relative;
        height: 14px;
        background: #e1edf1;
        border-radius: 999px;
        overflow: visible;
      }
      .report-root .bench-bar .fill {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--brand), var(--lilac));
      }
      .report-root .bench-bar .marker {
        position: absolute;
        top: -6px;
        bottom: -6px;
        width: 2px;
        background: #2c2240;
        border-radius: 2px;
      }
      .report-root .bench-bar .marker-label {
        position: absolute;
        top: 18px;
        transform: translateX(-50%);
        font-size: 9.5px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--ink-soft);
        font-weight: 700;
        white-space: nowrap;
      }
      .report-root .bench-bar .you-label {
        position: absolute;
        bottom: 18px;
        transform: translateX(-50%);
        font-size: 9.5px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--brand-dark);
        font-weight: 800;
        white-space: nowrap;
      }
      .report-root .bench-note {
        margin-top: 32px;
        font-size: 12px;
        color: var(--ink-soft);
        line-height: 1.65;
      }

      /* ───── Themes ───── */
      .report-root .theme-stack {
        display: grid;
        gap: 10px;
      }
      .report-root .theme {
        display: grid;
        grid-template-columns: 36px 1fr;
        gap: 12px;
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
      }
      .report-root .theme-num {
        font-size: 16px;
        font-weight: 800;
        color: var(--brand);
        letter-spacing: -0.02em;
      }
      .report-root .theme h4 {
        margin: 0 0 4px;
        font-size: 12.5px;
        color: var(--ink);
      }
      .report-root .theme p {
        margin: 0;
        font-size: 11.5px;
        line-height: 1.55;
        color: var(--ink-soft);
      }

      /* ───── Beats ───── */
      .report-root .beats {
        display: grid;
        gap: 10px;
      }
      .report-root .beat {
        display: grid;
        grid-template-columns: 28px 1fr;
        gap: 12px;
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
      }
      .report-root .beat .n {
        width: 26px;
        height: 26px;
        border-radius: 8px;
        background: linear-gradient(135deg, var(--brand), var(--brand-dark));
        color: #fff;
        font-weight: 800;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .report-root .beat h4 {
        margin: 0 0 4px;
        font-size: 12.5px;
        color: var(--ink);
      }
      .report-root .beat blockquote {
        margin: 0 0 4px;
        padding: 0 0 0 10px;
        border-left: 2px solid var(--brand);
        font-size: 12px;
        font-style: italic;
        color: var(--ink);
        line-height: 1.55;
      }
      .report-root .beat p {
        margin: 0;
        font-size: 11px;
        line-height: 1.55;
        color: var(--ink-soft);
      }

      /* ───── Takeaways ───── */
      .report-root .take-stack {
        display: grid;
        gap: 12px;
      }
      .report-root .take {
        display: grid;
        grid-template-columns: 44px 1fr;
        gap: 14px;
        align-items: flex-start;
        padding: 14px 16px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
      }
      .report-root .take-num {
        font-size: 26px;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.04em;
      }
      .report-root .take-head-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 4px;
      }
      .report-root .take h4 {
        margin: 0;
        font-size: 13px;
        color: var(--ink);
      }
      .report-root .take p {
        margin: 0;
        font-size: 11.5px;
        line-height: 1.6;
        color: var(--ink-soft);
      }
      .report-root .urg-pill {
        flex-shrink: 0;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        padding: 3px 8px;
        border-radius: 999px;
        white-space: nowrap;
      }
      .report-root .urg-pill.u-amber {
        color: #b46408;
        background: rgba(245, 158, 11, 0.14);
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      .report-root .urg-pill.u-purple {
        color: var(--brand-dark);
        background: rgba(42, 143, 158, 0.14);
        border: 1px solid rgba(42, 143, 158, 0.3);
      }
      .report-root .urg-pill.u-green {
        color: #047857;
        background: rgba(16, 185, 129, 0.14);
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      /* ───── 30 day footer block ───── */
      .report-root .thirty {
        margin-top: 18px;
        padding: 16px 18px;
        border: 1px dashed var(--brand);
        border-radius: 12px;
        background: linear-gradient(180deg, var(--brand-soft) 0%, #ffffff 100%);
      }
      .report-root .thirty p {
        margin: 6px 0 0;
        font-size: 12.5px;
        line-height: 1.7;
        color: var(--ink);
      }
    ` }} />
  )
}
