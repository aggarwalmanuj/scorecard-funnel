"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
} from "react"
import { Palette, Check, RotateCcw, Sparkles } from "lucide-react"

export type PaletteId =
  | "aurora"
  | "linen"
  | "stone"
  | "peony"
  | "lavender"
  | "saffron"
  | "clay"
  | "ember"
  | "plum"
  | "jade"
  | "marine"
  | "forest"
  | "custom"

type Swatch = {
  id: PaletteId
  name: string
  bg: string
  ink: string
  signal: string
}

// Twelve distinct moods spanning hue families. Aurora / Jade / Marine /
// Forest are kept as the cool-tone anchors. The other eight cover warm
// neutrals, pinks, purples, yellows, terracotta, and a stone monochrome
// — so the switcher reads as a curated mood board rather than a single
// blue-green family. Order: light → warm → mid → deep → dark.
export const PALETTES: Swatch[] = [
  { id: "aurora", name: "Aurora", bg: "#eaf0f4", ink: "#0f2c3b", signal: "#2a8f9e" },
  { id: "linen", name: "Linen", bg: "#f3ede2", ink: "#2c241b", signal: "#a07a4d" },
  { id: "stone", name: "Stone", bg: "#ecebe7", ink: "#181818", signal: "#7a6e62" },
  { id: "peony", name: "Peony", bg: "#f5e9e7", ink: "#3d1f30", signal: "#b86970" },
  { id: "lavender", name: "Lavender", bg: "#ece8f4", ink: "#2a1f4a", signal: "#6b5eb5" },
  { id: "saffron", name: "Saffron", bg: "#f5ecd9", ink: "#3a2c0e", signal: "#c08a2a" },
  { id: "clay", name: "Clay", bg: "#efe1d3", ink: "#3d251a", signal: "#a85a35" },
  { id: "ember", name: "Ember", bg: "#f3e8e3", ink: "#3a1414", signal: "#a8351e" },
  { id: "plum", name: "Plum", bg: "#ede4eb", ink: "#2c1c2a", signal: "#8a3d75" },
  { id: "jade", name: "Jade", bg: "#e6ede4", ink: "#0e2a1f", signal: "#358067" },
  { id: "marine", name: "Marine", bg: "#0f2c3b", ink: "#eaf0f4", signal: "#5fc5d4" },
  { id: "forest", name: "Forest", bg: "#1a2922", ink: "#eaf0e8", signal: "#9ec0a4" },
]

type CustomPalette = { bg: string; ink: string; signal: string }
const DEFAULT_CUSTOM: CustomPalette = {
  bg: "#eaf0f4",
  ink: "#0f2c3b",
  signal: "#2a8f9e",
}

const DEFAULT_PALETTE: PaletteId = "aurora"
const STORAGE_KEY = "minimal-landing-palette"
const CUSTOM_KEY = "minimal-landing-palette-custom"

type Ctx = {
  palette: PaletteId
  setPalette: (p: PaletteId) => void
  custom: CustomPalette
  setCustomColor: (key: keyof CustomPalette, value: string) => void
  resetCustom: () => void
}
const PaletteContext = createContext<Ctx | null>(null)

export function usePalette() {
  const ctx = useContext(PaletteContext)
  if (!ctx) throw new Error("usePalette must be used within <PaletteProvider>")
  return ctx
}

/**
 * Convert a #rrggbb (or #rgb) hex string to its three rgb components.
 * Returns black on parse failure rather than throwing — the swatch still
 * renders even if the user pastes nonsense, and the rest of the palette
 * stays usable.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let v = hex.trim().replace("#", "")
  if (v.length === 3) {
    v = v
      .split("")
      .map((c) => c + c)
      .join("")
  }
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return { r: 0, g: 0, b: 0 }
  const n = parseInt(v, 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}

/**
 * Build the full token map from the three user inputs. We derive all the
 * surface tokens via color-mix() so the user only has to make three
 * decisions. Inline-style CSS variables override [data-palette="custom"]
 * because inline styles win specificity, so this composes cleanly with
 * the existing palette infrastructure.
 */
function customCssVars(p: CustomPalette): CSSProperties {
  const sig = hexToRgb(p.signal)
  const ink = hexToRgb(p.ink)
  // The cast keeps TypeScript happy about CSS custom properties without
  // resorting to `as any` at every line.
  const vars: Record<string, string> = {
    "--background": p.bg,
    "--ink": p.ink,
    "--signal": p.signal,
    "--primary": p.ink,
    "--primary-foreground": p.bg,
    "--card": `color-mix(in srgb, ${p.bg} 92%, white)`,
    "--card-foreground": p.ink,
    "--popover": `color-mix(in srgb, ${p.bg} 92%, white)`,
    "--popover-foreground": p.ink,
    "--foreground": `color-mix(in srgb, ${p.ink} 55%, ${p.bg})`,
    "--secondary": `color-mix(in srgb, ${p.bg} 78%, ${p.ink})`,
    "--secondary-foreground": p.ink,
    "--muted": `color-mix(in srgb, ${p.bg} 72%, ${p.ink})`,
    "--muted-foreground": `color-mix(in srgb, ${p.ink} 60%, ${p.bg})`,
    "--accent": p.signal,
    "--accent-foreground": p.bg,
    "--border": `color-mix(in srgb, ${p.bg} 78%, ${p.ink})`,
    "--input": `color-mix(in srgb, ${p.bg} 60%, ${p.ink})`,
    "--ring": p.ink,
    "--glow": `${sig.r} ${sig.g} ${sig.b}`,
    "--shadow-ink": `${ink.r}, ${ink.g}, ${ink.b}`,
  }
  return vars as CSSProperties
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE)
  const [custom, setCustomState] = useState<CustomPalette>(DEFAULT_CUSTOM)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as PaletteId | null
      if (saved === "custom" || PALETTES.some((p) => p.id === saved)) {
        setPaletteState(saved as PaletteId)
      }
      const savedCustom = window.localStorage.getItem(CUSTOM_KEY)
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom) as Partial<CustomPalette>
        setCustomState({
          bg: parsed.bg ?? DEFAULT_CUSTOM.bg,
          ink: parsed.ink ?? DEFAULT_CUSTOM.ink,
          signal: parsed.signal ?? DEFAULT_CUSTOM.signal,
        })
      }
    } catch {
      // ignore — fall back to defaults.
    }
    setHydrated(true)
  }, [])

  const setPalette = (p: PaletteId) => {
    setPaletteState(p)
    try {
      window.localStorage.setItem(STORAGE_KEY, p)
    } catch {
      // ignore
    }
  }

  // Editing a color input also auto-activates the custom palette so the
  // change is immediately visible. No "apply" button needed.
  const setCustomColor = (key: keyof CustomPalette, value: string) => {
    const next = { ...custom, [key]: value }
    setCustomState(next)
    try {
      window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
    if (palette !== "custom") setPalette("custom")
  }

  const resetCustom = () => {
    setCustomState(DEFAULT_CUSTOM)
    try {
      window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(DEFAULT_CUSTOM))
    } catch {
      // ignore
    }
  }

  const wrapperStyle =
    palette === "custom" ? customCssVars(custom) : undefined

  return (
    <PaletteContext.Provider
      value={{ palette, setPalette, custom, setCustomColor, resetCustom }}
    >
      <div
        data-palette={palette}
        style={wrapperStyle}
        suppressHydrationWarning
      >
        {children}
      </div>
      {hydrated && <PaletteSwitcherWidget />}
    </PaletteContext.Provider>
  )
}

function PaletteSwitcherWidget() {
  const { palette, setPalette, custom, setCustomColor, resetCustom } =
    usePalette()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const isCustom = palette === "custom"

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {open && (
        <div
          className="mb-3 w-80 rounded-md p-5 shadow-2xl animate-fade-in-up animation-duration-[0.4s]"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--card-foreground)",
            border: "1px solid var(--border)",
          }}
          role="dialog"
          aria-label="Color palette"
        >
          <div className="mb-4 flex items-baseline justify-between">
            <p className="eyebrow">Palettes</p>
            <span className="text-[10px] tracking-wide opacity-50">
              {PALETTES.length} cool moods + custom
            </span>
          </div>

          <ul className="grid grid-cols-2 gap-1.5">
            {PALETTES.map((p) => {
              const active = p.id === palette
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPalette(p.id)}
                    aria-pressed={active}
                    className="group flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors"
                    style={{
                      backgroundColor: active
                        ? "color-mix(in srgb, var(--foreground) 8%, transparent)"
                        : "transparent",
                    }}
                  >
                    <span
                      className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-sm transition-transform group-hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${p.bg} 0% 50%, ${p.ink} 50% 100%)`,
                        border:
                          "1px solid color-mix(in srgb, var(--foreground) 18%, transparent)",
                      }}
                    >
                      <span
                        className="absolute h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: p.signal,
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate font-serif text-[14px]"
                        style={{ color: "var(--ink)" }}
                      >
                        {p.name}
                      </span>
                      <span className="block truncate text-[10px] tracking-wide opacity-50">
                        {p.bg.toUpperCase()} · {p.ink.toUpperCase()}
                      </span>
                    </span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 hairline" />

          {/* Custom palette composer. Editing any input auto-activates the
              custom palette, so changes are visible immediately. */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setPalette("custom")}
              aria-pressed={isCustom}
              className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors"
              style={{
                backgroundColor: isCustom
                  ? "color-mix(in srgb, var(--foreground) 8%, transparent)"
                  : "transparent",
              }}
            >
              <span
                className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-sm transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${custom.bg} 0% 50%, ${custom.ink} 50% 100%)`,
                  border:
                    "1px solid color-mix(in srgb, var(--foreground) 18%, transparent)",
                }}
              >
                <span
                  className="absolute h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: custom.signal,
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="flex items-center gap-1.5 font-serif text-[14px]"
                  style={{ color: "var(--ink)" }}
                >
                  <Sparkles className="h-3 w-3 opacity-70" strokeWidth={1.5} />
                  Custom
                </span>
                <span className="block truncate text-[10px] tracking-wide opacity-50">
                  Compose your own
                </span>
              </span>
              {isCustom && <Check className="h-3.5 w-3.5 shrink-0 opacity-70" />}
            </button>

            <div className="mt-3 space-y-2 rounded-sm p-3" style={{
              backgroundColor: "color-mix(in srgb, var(--foreground) 4%, transparent)",
              border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
            }}>
              <ColorRow
                label="Background"
                value={custom.bg}
                onChange={(v) => setCustomColor("bg", v)}
              />
              <ColorRow
                label="Ink"
                value={custom.ink}
                onChange={(v) => setCustomColor("ink", v)}
              />
              <ColorRow
                label="Signal"
                value={custom.signal}
                onChange={(v) => setCustomColor("signal", v)}
              />

              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] tracking-wide opacity-55">
                  Other tokens derive automatically
                </p>
                <button
                  type="button"
                  onClick={resetCustom}
                  className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-[0.18em] opacity-65 transition-opacity hover:opacity-100"
                  aria-label="Reset custom palette"
                >
                  <RotateCcw className="h-2.5 w-2.5" strokeWidth={1.5} />
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 hairline" />
          <p className="mt-3 text-[10px] tracking-wide opacity-55">
            Live preview · saved to this browser only.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Switch color palette"
        className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all hover:-translate-y-0.5 hover:scale-105"
        style={{
          backgroundColor: "var(--ink)",
          color: "var(--background)",
        }}
      >
        <Palette className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </div>
  )
}

/**
 * A single labeled color picker row — uses the native color input for the
 * picker affordance and a synced text input so users can paste a hex value
 * directly. Both write back through the same setter.
 */
function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  // Track text input separately so the user can type partial values
  // (e.g. "#0f2") without the live preview flickering. We commit on blur
  // and on valid full hex.
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])

  const commitText = (raw: string) => {
    let v = raw.trim()
    if (!v.startsWith("#")) v = "#" + v
    if (/^#[0-9a-fA-F]{6}$/.test(v) || /^#[0-9a-fA-F]{3}$/.test(v)) {
      onChange(v.toLowerCase())
    }
  }

  return (
    <label className="flex items-center gap-2">
      <span
        className="w-20 shrink-0 text-[10px] uppercase tracking-[0.18em] opacity-65"
        style={{ color: "var(--foreground)" }}
      >
        {label}
      </span>
      <span
        className="relative inline-flex h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-sm"
        style={{
          backgroundColor: value,
          border: "1px solid color-mix(in srgb, var(--foreground) 22%, transparent)",
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={`${label} color`}
        />
      </span>
      <input
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          commitText(e.target.value)
        }}
        onBlur={(e) => commitText(e.target.value)}
        className="h-7 min-w-0 flex-1 rounded-sm px-2 font-mono text-[11px] tracking-wide outline-none transition-colors"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--ink)",
          border: "1px solid color-mix(in srgb, var(--foreground) 18%, transparent)",
        }}
        spellCheck={false}
        aria-label={`${label} hex value`}
      />
    </label>
  )
}
