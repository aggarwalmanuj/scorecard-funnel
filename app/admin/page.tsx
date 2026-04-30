"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ChevronDown,
  Save,
  Lock,
  Copy,
  Check,
  Search,
  Download,
  Upload,
  X,
  Filter,
  User,
  Users,
} from "lucide-react"

type Audience = "individual" | "team"

type Question = {
  stageFraming: string
  question: string
  prompt: string
  hintBox: string
  placeholder: string
  quoteZone: string
}

type Beat = {
  label: string
  title: string
  subtitle: string
  feedbackQuestion: string
  systemContext: string
  userPrompt: string
}

type AudienceData = {
  systemPrompt: string
  questions: Question[]
  beats: Beat[]
}

const EMPTY_QUESTIONS: Question[] = Array.from({ length: 5 }, () => ({
  stageFraming: "",
  question: "",
  prompt: "",
  hintBox: "",
  placeholder: "",
  quoteZone: "",
}))

const EMPTY_BEATS: Beat[] = Array.from({ length: 5 }, () => ({
  label: "",
  title: "",
  subtitle: "",
  feedbackQuestion: "",
  systemContext: "",
  userPrompt: "",
}))

const emptyAudienceData = (): AudienceData => ({
  systemPrompt: "",
  questions: structuredClone(EMPTY_QUESTIONS),
  beats: structuredClone(EMPTY_BEATS),
})

const TAGS = ["{{NAME}}", "{{Q1}}", "{{Q2}}", "{{Q3}}", "{{Q4}}", "{{Q5}}", "{{GATE2}}", "{{GATE4}}"] as const

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [saveLabel, setSaveLabel] = useState("Save Changes")
  const [saveDisabled, setSaveDisabled] = useState(false)
  const [copiedTag, setCopiedTag] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const [audience, setAudience] = useState<Audience>("individual")
  const [tab, setTab] = useState<"system" | "questions" | "beats" | "responses">("system")

  // Per-audience editor state. Both audiences persist in memory so switching
  // between them doesn't lose unsaved work.
  const [data, setData] = useState<Record<Audience, AudienceData>>({
    individual: emptyAudienceData(),
    team: emptyAudienceData(),
  })

  const [openCards, setOpenCards] = useState<Record<string, boolean>>({})

  // Responses tab state
  type UserResponse = {
    id: string
    firstName: string
    email: string
    audience?: Audience | ""
    createdAt: string
    question1: string; question2: string; question3: string; question4: string; question5: string
    question1_text?: string; question2_text?: string; question3_text?: string; question4_text?: string; question5_text?: string
    beat1_feedback: string; beat2_feedback: string; beat3_feedback: string; beat4_feedback: string; beat5_feedback: string
    beat1_output: string; beat2_output: string; beat3_output: string; beat4_output: string; beat5_output: string
  }
  const [responses, setResponses] = useState<UserResponse[]>([])
  const [responsesLoading, setResponsesLoading] = useState(false)
  const [responsesError, setResponsesError] = useState("")
  const [responsesCursor, setResponsesCursor] = useState<string | undefined>()
  const [responsesHasMore, setResponsesHasMore] = useState(false)
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({})
  const [expandedOutputs, setExpandedOutputs] = useState<Record<string, boolean>>({})
  const didLoadResponses = useRef(false)

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchDateFrom, setSearchDateFrom] = useState("")
  const [searchDateTo, setSearchDateTo] = useState("")
  const [searchCompleted, setSearchCompleted] = useState<"all" | "true" | "false">("all")
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [searchResults, setSearchResults] = useState<UserResponse[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const didAutoLoad = useRef(false)
  const current = data[audience]

  /**
   * Read raw Cosmos prompt map and unpack BOTH audiences into our editor state.
   * The keys we care about are suffixed `_individual` and `_team`.
   */
  const unpackPrompts = useCallback((raw: Record<string, string>) => {
    const next: Record<Audience, AudienceData> = {
      individual: emptyAudienceData(),
      team: emptyAudienceData(),
    }
    for (const aud of ["individual", "team"] as Audience[]) {
      next[aud].systemPrompt = raw[`system_prompt_${aud}`] || ""
      const qRaw = raw[`questions_${aud}`]
      if (qRaw) {
        try {
          const parsed = JSON.parse(qRaw)
          if (Array.isArray(parsed)) next[aud].questions = parsed
        } catch {
          /* keep empty */
        }
      }
      next[aud].beats = EMPTY_BEATS.map((_, i) => ({
        label: raw[`beat${i + 1}_label_${aud}`] || "",
        title: raw[`beat${i + 1}_title_${aud}`] || "",
        subtitle: raw[`beat${i + 1}_subtitle_${aud}`] || "",
        feedbackQuestion: raw[`beat${i + 1}_feedbackQuestion_${aud}`] || "",
        systemContext: raw[`beat${i + 1}_systemContext_${aud}`] || "",
        userPrompt: raw[`beat${i + 1}_prompt_${aud}`] || "",
      }))
    }
    setData(next)
  }, [])

  const loadPrompts = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const pw = sessionStorage.getItem("admin-api-password") ?? ""
      const res = await fetch("/api/admin/prompts", {
        headers: pw ? { "X-Admin-Password": pw } : {},
      })
      if (!res.ok) throw new Error("HTTP " + res.status)
      const json = await res.json()
      if (json.ok && json.data) {
        unpackPrompts(json.data as Record<string, string>)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setLoadError(`Failed to load prompts: ${msg}. Fields are empty — configure prompts manually.`)
    } finally {
      setLoading(false)
    }
  }, [unpackPrompts])

  const loadResponses = useCallback(async (cursor?: string) => {
    setResponsesLoading(true)
    setResponsesError("")
    try {
      const params = new URLSearchParams({ pageSize: "25" })
      if (cursor) params.set("continuationToken", cursor)
      const headers: Record<string, string> = {}
      const stored = sessionStorage.getItem("admin-api-password")
      if (stored) headers["X-Admin-Password"] = stored
      const res = await fetch(`/api/admin/responses?${params}`, { headers })
      if (res.status === 401) throw new Error("Unauthorized")
      if (!res.ok) throw new Error("HTTP " + res.status)
      const json = await res.json()
      if (json.ok) {
        setResponses((prev) => (cursor ? [...prev, ...json.users] : json.users))
        setResponsesCursor(json.continuationToken)
        setResponsesHasMore(json.hasMore)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setResponsesError(`Failed to load responses: ${msg}`)
    } finally {
      setResponsesLoading(false)
    }
  }, [])

  const handleSearch = useCallback(async () => {
    setSearchLoading(true)
    setSearchError("")
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.set("q", searchQuery.trim())
      if (searchDateFrom) params.set("dateFrom", searchDateFrom)
      if (searchDateTo) params.set("dateTo", searchDateTo)
      if (searchCompleted !== "all") params.set("completed", searchCompleted)
      const headers: Record<string, string> = {}
      const stored = sessionStorage.getItem("admin-api-password")
      if (stored) headers["X-Admin-Password"] = stored
      const res = await fetch(`/api/admin/responses/search?${params}`, { headers })
      if (res.status === 401) throw new Error("Unauthorized")
      if (!res.ok) throw new Error("HTTP " + res.status)
      const json = await res.json()
      if (json.ok) {
        setSearchResults(json.users)
        setIsSearchActive(true)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setSearchError(`Search failed: ${msg}`)
    } finally {
      setSearchLoading(false)
    }
  }, [searchQuery, searchDateFrom, searchDateTo, searchCompleted])

  const clearSearch = () => {
    setSearchQuery("")
    setSearchDateFrom("")
    setSearchDateTo("")
    setSearchCompleted("all")
    setIsSearchActive(false)
    setSearchResults([])
    setSearchError("")
    setSelectedIds(new Set())
  }

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const displayed = isSearchActive ? searchResults : responses
    if (selectedIds.size === displayed.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayed.map((r) => r.id)))
    }
  }

  const downloadResponses = (items: UserResponse[]) => {
    const clean = items.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      email: r.email,
      audience: r.audience ?? "",
      createdAt: r.createdAt,
      question1: r.question1, question1_text: r.question1_text ?? "",
      question2: r.question2, question2_text: r.question2_text ?? "",
      question3: r.question3, question3_text: r.question3_text ?? "",
      question4: r.question4, question4_text: r.question4_text ?? "",
      question5: r.question5, question5_text: r.question5_text ?? "",
      beat1_feedback: r.beat1_feedback, beat2_feedback: r.beat2_feedback,
      beat3_feedback: r.beat3_feedback, beat4_feedback: r.beat4_feedback, beat5_feedback: r.beat5_feedback,
      beat1_output: r.beat1_output, beat2_output: r.beat2_output, beat3_output: r.beat3_output,
      beat4_output: r.beat4_output, beat5_output: r.beat5_output,
    }))
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ufa-responses-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSelected = () => {
    const displayed = isSearchActive ? searchResults : responses
    const items = displayed.filter((r) => selectedIds.has(r.id))
    if (items.length === 0) return
    downloadResponses(items)
  }

  const downloadAll = () => {
    const displayed = isSearchActive ? searchResults : responses
    if (displayed.length === 0) return
    downloadResponses(displayed)
  }

  const validatePassword = useCallback(async (pw: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/prompts", {
        headers: { "X-Admin-Password": pw },
      })
      return res.ok
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("admin-last-saved-at")
    if (stored) setLastSavedAt(stored)
  }, [])

  useEffect(() => {
    if (didAutoLoad.current) return
    didAutoLoad.current = true
    if (typeof window === "undefined") return
    const stored = sessionStorage.getItem("admin-api-password")
    if (stored !== null) {
      setPassword(stored)
      void validatePassword(stored).then((valid) => {
        if (valid) {
          setAuthed(true)
          void loadPrompts()
        } else {
          sessionStorage.removeItem("admin-api-password")
        }
      })
    }
  }, [loadPrompts, validatePassword])

  useEffect(() => {
    if (tab === "responses" && authed && !didLoadResponses.current) {
      didLoadResponses.current = true
      void loadResponses()
    }
  }, [tab, authed, loadResponses])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError("")
    const valid = await validatePassword(password)
    if (!valid) {
      setAuthError("Invalid password.")
      return
    }
    sessionStorage.setItem("admin-api-password", password)
    setAuthed(true)
    void loadPrompts()
  }

  /**
   * Save BOTH audiences in a single round-trip — keeps the API simple and the
   * editor consistent. Each key is suffixed with the audience.
   */
  const handleSave = async () => {
    setSaveDisabled(true)
    setSaveLabel("Saving...")
    const payload: Record<string, string> = {}
    for (const aud of ["individual", "team"] as Audience[]) {
      const ad = data[aud]
      payload[`system_prompt_${aud}`] = ad.systemPrompt
      payload[`questions_${aud}`] = JSON.stringify(ad.questions)
      ad.beats.forEach((b, i) => {
        payload[`beat${i + 1}_prompt_${aud}`] = b.userPrompt
        payload[`beat${i + 1}_label_${aud}`] = b.label
        payload[`beat${i + 1}_title_${aud}`] = b.title
        payload[`beat${i + 1}_subtitle_${aud}`] = b.subtitle
        payload[`beat${i + 1}_feedbackQuestion_${aud}`] = b.feedbackQuestion
        payload[`beat${i + 1}_systemContext_${aud}`] = b.systemContext
      })
    }
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (password) headers["X-Admin-Password"] = password
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers,
        body: JSON.stringify({ data: payload }),
      })
      if (res.status === 401) {
        alert("Unauthorized — check your admin password.")
        setSaveLabel("Save Changes")
        return
      }
      if (!res.ok) throw new Error("HTTP " + res.status)
      const savedIso = new Date().toISOString()
      setLastSavedAt(savedIso)
      try {
        localStorage.setItem("admin-last-saved-at", savedIso)
      } catch {
        /* quota */
      }
      setSaveLabel("Saved!")
      setTimeout(() => setSaveLabel("Save Changes"), 2000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      alert("Failed to save: " + msg)
      setSaveLabel("Save Changes")
    } finally {
      setSaveDisabled(false)
    }
  }

  const importFileRef = useRef<HTMLInputElement>(null)

  const isQuestionShape = (v: unknown): v is Question => {
    if (!v || typeof v !== "object") return false
    const o = v as Record<string, unknown>
    return (
      typeof o.stageFraming === "string" &&
      typeof o.question === "string" &&
      typeof o.prompt === "string" &&
      typeof o.hintBox === "string" &&
      typeof o.placeholder === "string" &&
      typeof o.quoteZone === "string"
    )
  }

  const isBeatShape = (v: unknown): v is Beat => {
    if (!v || typeof v !== "object") return false
    const o = v as Record<string, unknown>
    return (
      typeof o.label === "string" &&
      typeof o.systemContext === "string" &&
      typeof o.userPrompt === "string" &&
      (o.title === undefined || typeof o.title === "string") &&
      (o.subtitle === undefined || typeof o.subtitle === "string")
    )
  }

  /**
   * Imports JSON config into the CURRENT audience tab only — never overwrites
   * the other audience. This is intentional: admins seed each audience
   * separately so accidental cross-pollination is impossible.
   */
  const handleImportConfig = async (file: File) => {
    try {
      if (file.size > 2 * 1024 * 1024) {
        alert("File too large (max 2 MB). Is this the right file?")
        return
      }
      const text = await file.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        alert("Invalid JSON file — could not parse.")
        return
      }
      if (!parsed || typeof parsed !== "object") {
        alert("Invalid config file — expected a JSON object.")
        return
      }
      const obj = parsed as Record<string, unknown>

      if (typeof obj.systemPrompt !== "string") {
        alert("Invalid config: missing or non-string 'systemPrompt'.")
        return
      }
      if (!Array.isArray(obj.questions) || obj.questions.length !== 5 || !obj.questions.every(isQuestionShape)) {
        alert("Invalid config: 'questions' must be an array of exactly 5 question objects.")
        return
      }
      if (!Array.isArray(obj.beats) || obj.beats.length !== 5 || !obj.beats.every(isBeatShape)) {
        alert("Invalid config: 'beats' must be an array of exactly 5 beat objects.")
        return
      }

      const exportedAtRaw = typeof obj.exportedAt === "string" ? obj.exportedAt : ""
      let exportedAtLabel = ""
      if (exportedAtRaw) {
        try {
          exportedAtLabel = new Date(exportedAtRaw).toLocaleString()
        } catch { exportedAtLabel = exportedAtRaw }
      }

      const confirmed = window.confirm(
        `This will replace the System Prompt, Questions, and Beats for the ${audience.toUpperCase()} audience only.\n\n` +
        (exportedAtLabel ? `Backup export timestamp: ${exportedAtLabel}\n\n` : "") +
        `A backup of the current ${audience} editor state will be downloaded first.\n\n` +
        `Nothing is saved to the database until you click Save Changes.\n\nProceed?`
      )
      if (!confirmed) return

      try { handleDownloadConfig() } catch { /* download failures shouldn't block */ }

      const newQuestions = obj.questions as Question[]
      const newBeats = (obj.beats as Record<string, string>[]).map((b) => ({
        label: b.label ?? "",
        title: b.title ?? "",
        subtitle: b.subtitle ?? "",
        feedbackQuestion: b.feedbackQuestion ?? "",
        systemContext: b.systemContext ?? "",
        userPrompt: b.userPrompt ?? "",
      }))

      setData((prev) => ({
        ...prev,
        [audience]: {
          systemPrompt: obj.systemPrompt as string,
          questions: newQuestions,
          beats: newBeats,
        },
      }))
      alert(`Config imported into the ${audience} editor. Click Save Changes to persist.`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      alert("Failed to import: " + msg)
    }
  }

  const handleDownloadConfig = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 2,
      audience,
      systemPrompt: current.systemPrompt,
      questions: current.questions,
      beats: current.beats,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    a.href = url
    a.download = `ufa-config-${audience}-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag).catch(() => {})
    setCopiedTag(tag)
    setTimeout(() => setCopiedTag(null), 1500)
  }

  const updateSystemPrompt = (value: string) =>
    setData((prev) => ({ ...prev, [audience]: { ...prev[audience], systemPrompt: value } }))

  const updateQuestion = <K extends keyof Question>(idx: number, key: K, value: Question[K]) => {
    setData((prev) => ({
      ...prev,
      [audience]: {
        ...prev[audience],
        questions: prev[audience].questions.map((q, i) => (i === idx ? { ...q, [key]: value } : q)),
      },
    }))
  }

  const updateBeat = <K extends keyof Beat>(idx: number, key: K, value: Beat[K]) => {
    setData((prev) => ({
      ...prev,
      [audience]: {
        ...prev[audience],
        beats: prev[audience].beats.map((b, i) => (i === idx ? { ...b, [key]: value } : b)),
      },
    }))
  }

  const toggleCard = (id: string) => {
    setOpenCards((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleResponse = (id: string) => {
    setExpandedResponses((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleOutput = (key: string) => {
    setExpandedOutputs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const formatDate = (iso: string) => {
    if (!iso) return "—"
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    } catch { return iso }
  }

  const tabConfig = [
    { value: "system" as const, label: "System Prompt", activeClass: "bg-foreground text-background" },
    { value: "questions" as const, label: "Questions", activeClass: "bg-primary text-primary-foreground" },
    { value: "beats" as const, label: "Beat Prompts", activeClass: "bg-[#8b7cf6] text-white" },
    { value: "responses" as const, label: "Responses", activeClass: "bg-indigo-500 text-white" },
  ]

  // ── Login Screen ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <form
          className="w-full max-w-sm bg-card rounded-2xl p-8 neu-card-primary animate-scale-in"
          onSubmit={handleLogin}
        >
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-black text-xl text-foreground">Admin Access</h2>
            <p className="text-muted-foreground text-sm mt-1">Enter the admin password to manage prompts.</p>
          </div>

          <div className="mb-4">
            <label htmlFor="api-password" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Admin Password
            </label>
            <Input
              type="password"
              id="api-password"
              placeholder="Password (leave empty if none set)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 border-2 border-foreground/15 focus:border-primary rounded-xl"
            />
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-destructive/5 border-2 border-destructive/20 text-destructive text-sm mb-4">
              {authError}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 font-bold rounded-xl neu-border-primary neu-shadow-primary-sm neu-btn-press"
          >
            Connect
          </Button>
        </form>
      </div>
    )
  }

  // ── Main Admin Panel ──
  const audienceClass = audience === "individual" ? "bg-primary text-primary-foreground" : "bg-[#8b7cf6] text-white"

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b-2 border-foreground/10">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg font-black text-foreground leading-tight">Prompt Admin</h1>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {lastSavedAt ? `Last saved: ${formatDate(lastSavedAt)}` : "Last saved: —"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={importFileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImportConfig(file)
                e.target.value = ""
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl font-bold"
              onClick={() => importFileRef.current?.click()}
              disabled={loading}
              type="button"
              title={`Upload JSON into the ${audience} editor`}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              Import to {audience}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl font-bold"
              onClick={handleDownloadConfig}
              disabled={loading}
              type="button"
              title={`Download the ${audience} editor state as JSON`}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export {audience}
            </Button>
            <Button
              size="sm"
              className="rounded-xl font-bold neu-border-primary neu-shadow-primary-xs neu-btn-press"
              onClick={handleSave}
              disabled={saveDisabled}
              type="button"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saveLabel}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {/* Intro */}
        <div className="mb-6 animate-fade-in-up">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-primary mb-2 flex items-center gap-2">
            <span className="w-5 h-px bg-primary/40" />
            Your Unfair Advantage · Prompt Configuration
          </p>
          <p className="text-muted-foreground text-[15px] leading-relaxed max-w-2xl">
            Edit the system prompt, question prompts, and beat prompts. Toggle between the{" "}
            <span className="font-extrabold text-foreground">Individual</span> and{" "}
            <span className="font-extrabold text-foreground">Team</span> audiences — each has its
            own content. <span className="font-bold">Save Changes</span> writes both audiences in one
            round-trip.
          </p>
          {loadError && (
            <div className="mt-3 p-3 rounded-xl bg-destructive/5 border-2 border-destructive/20 text-destructive text-sm">
              {loadError}
            </div>
          )}
          <div className="flex gap-2 mt-3 flex-wrap">
            <Badge variant="secondary" className="rounded-lg px-3 py-1 text-xs gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Cosmos DB
            </Badge>
            <Badge variant="secondary" className="rounded-lg px-3 py-1 text-xs gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {current.questions.length} questions
            </Badge>
            <Badge variant="secondary" className="rounded-lg px-3 py-1 text-xs gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b7cf6]" />
              {current.beats.length} beats
            </Badge>
          </div>
        </div>

        {/* Audience toggle — only for content tabs */}
        {tab !== "responses" && (
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              Audience
            </span>
            <div className="inline-flex bg-card border-2 border-border rounded-xl p-1 neu-shadow-xs">
              <button
                type="button"
                onClick={() => setAudience("individual")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 inline-flex items-center gap-2 ${
                  audience === "individual"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Individual
              </button>
              <button
                type="button"
                onClick={() => setAudience("team")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 inline-flex items-center gap-2 ${
                  audience === "team"
                    ? "bg-[#8b7cf6] text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Team
              </button>
            </div>
            <span className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${audienceClass}`}>
              Editing: {audience}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
            <span className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            Loading prompts...
          </div>
        ) : (
          <div className="animate-fade-in-up delay-100">
            {/* Tab Navigation */}
            <div className="inline-flex bg-card border-2 border-border rounded-xl p-1 mb-6 flex-wrap gap-0.5 neu-shadow-xs">
              {tabConfig.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTab(t.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                    tab === t.value
                      ? t.activeClass
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── System Prompt Tab ── */}
            {tab === "system" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-secondary/30 border border-primary/10 text-sm text-muted-foreground leading-relaxed">
                  Editing the <strong className="text-foreground capitalize">{audience}</strong> system prompt. Sent
                  as the system message to the AI for every beat. Use placeholders:{" "}
                  <code className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-xs">{"{{NAME}}"}</code>,{" "}
                  <code className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-xs">{"{{Q1}}"}</code>–<code className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-xs">{"{{Q5}}"}</code>{" "}
                  which are replaced with user data at runtime.
                </div>

                <div className="bg-card rounded-2xl neu-card overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        System Prompt — {audience}
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {current.systemPrompt.length} chars
                      </span>
                    </div>
                    <Textarea
                      rows={24}
                      value={current.systemPrompt}
                      onChange={(e) => updateSystemPrompt(e.target.value)}
                      className="min-h-[400px] font-mono text-sm border-2 border-foreground/15 focus:border-primary rounded-xl resize-y"
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {["{{NAME}}", "{{Q1}}", "{{Q2}}", "{{Q3}}", "{{Q4}}", "{{Q5}}"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => copyTag(t)}
                          className="inline-flex items-center gap-1 font-mono text-xs text-primary bg-secondary px-2.5 py-1 rounded-lg border border-primary/15 hover:bg-primary/10 hover:border-primary/25 transition-all duration-200 active:scale-95"
                        >
                          {copiedTag === t ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Questions Tab ── */}
            {tab === "questions" && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-secondary/30 border border-primary/10 text-sm text-muted-foreground leading-relaxed">
                  Editing the <strong className="text-foreground capitalize">{audience}</strong> question copy. The
                  user sees these in order during the diagnostic.
                </div>
                {current.questions.map((q, i) => {
                  const id = `q${audience}${i}`
                  const open = !!openCards[id]
                  return (
                    <div key={id} className={`bg-card rounded-2xl overflow-hidden transition-all duration-300 ${open ? "neu-card-primary" : "neu-card"}`}>
                      <button
                        type="button"
                        onClick={() => toggleCard(id)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors duration-200"
                      >
                        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wider text-primary">{q.stageFraming || "—"}</p>
                          <p className="text-sm text-foreground truncate mt-0.5">{q.question.slice(0, 80) || "(empty)"}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 mr-2">{wordCount(q.question + q.prompt)} words</span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                      </button>

                      {open && (
                        <div className="border-t border-border/60 p-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Stage Framing</label>
                              <Input
                                value={q.stageFraming}
                                onChange={(e) => updateQuestion(i, "stageFraming", e.target.value)}
                                className="border-2 border-foreground/15 focus:border-primary rounded-xl"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Placeholder</label>
                              <Input
                                value={q.placeholder}
                                onChange={(e) => updateQuestion(i, "placeholder", e.target.value)}
                                className="border-2 border-foreground/15 focus:border-primary rounded-xl"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Question</label>
                            <Textarea rows={3} value={q.question} onChange={(e) => updateQuestion(i, "question", e.target.value)} className="border-2 border-foreground/15 focus:border-primary rounded-xl" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Prompt / Context</label>
                            <Textarea rows={5} value={q.prompt} onChange={(e) => updateQuestion(i, "prompt", e.target.value)} className="border-2 border-foreground/15 focus:border-primary rounded-xl" />
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Hint Box</label>
                              <Textarea rows={2} value={q.hintBox} onChange={(e) => updateQuestion(i, "hintBox", e.target.value)} className="border-2 border-foreground/15 focus:border-primary rounded-xl" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Quote Zone</label>
                              <Textarea rows={2} value={q.quoteZone} onChange={(e) => updateQuestion(i, "quoteZone", e.target.value)} className="border-2 border-foreground/15 focus:border-primary rounded-xl" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Beats Tab ── */}
            {tab === "beats" && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-secondary/30 border border-primary/10 text-sm text-muted-foreground leading-relaxed">
                  Editing the <strong className="text-foreground capitalize">{audience}</strong> beat prompts. The{" "}
                  <strong className="text-foreground">System Context</strong> sets the AI&apos;s role. The{" "}
                  <strong className="text-foreground">User Prompt</strong> is the instruction sent to the AI. Use{" "}
                  <code className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-xs">{"{{GATE2}}"}</code> and{" "}
                  <code className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-xs">{"{{GATE4}}"}</code> placeholders.
                </div>

                {current.beats.map((b, i) => {
                  const id = `b${audience}${i}`
                  const open = !!openCards[id]
                  return (
                    <div key={id} className={`bg-card rounded-2xl overflow-hidden transition-all duration-300 ${open ? "neu-card-primary" : "neu-card"}`}>
                      <button
                        type="button"
                        onClick={() => toggleCard(id)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors duration-200"
                      >
                        <span className="w-8 h-8 rounded-full bg-[#8b7cf6]/10 text-[#8b7cf6] text-sm font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#8b7cf6]">Beat {i + 1}</p>
                          <p className="text-sm text-foreground truncate mt-0.5">{b.label || "(empty)"}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 mr-2">{wordCount(b.systemContext + b.userPrompt)} words</span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                      </button>

                      {open && (
                        <div className="border-t border-border/60 p-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Label</label>
                            <Input value={b.label} onChange={(e) => updateBeat(i, "label", e.target.value)} className="border-2 border-foreground/15 focus:border-primary rounded-xl" placeholder="e.g. What the mirror sees" />
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Title</label>
                              <Textarea rows={2} value={b.title} onChange={(e) => updateBeat(i, "title", e.target.value)} className="border-2 border-foreground/15 focus:border-primary rounded-xl" placeholder="Heading shown on beat reveal page" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Subtitle</label>
                              <Textarea rows={2} value={b.subtitle} onChange={(e) => updateBeat(i, "subtitle", e.target.value)} className="border-2 border-foreground/15 focus:border-primary rounded-xl" placeholder="Subheading shown below the title" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Feedback Question</label>
                            <Input value={b.feedbackQuestion} onChange={(e) => updateBeat(i, "feedbackQuestion", e.target.value)} className="border-2 border-foreground/15 focus:border-primary rounded-xl" placeholder="e.g. Does this feel accurate to where you are right now?" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">System Context</label>
                            <Textarea rows={4} value={b.systemContext} onChange={(e) => updateBeat(i, "systemContext", e.target.value)} className="font-mono text-sm border-2 border-foreground/15 focus:border-primary rounded-xl" />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">User Prompt</label>
                              <span className="text-xs text-muted-foreground">{b.userPrompt.length} chars</span>
                            </div>
                            <Textarea rows={6} value={b.userPrompt} onChange={(e) => updateBeat(i, "userPrompt", e.target.value)} className="border-2 border-foreground/15 focus:border-primary rounded-xl" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {TAGS.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => copyTag(t)}
                                className="inline-flex items-center gap-1 font-mono text-xs text-primary bg-secondary px-2.5 py-1 rounded-lg border border-primary/15 hover:bg-primary/10 hover:border-primary/25 transition-all duration-200 active:scale-95"
                              >
                                {copiedTag === t ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Responses Tab ── */}
            {tab === "responses" && (
              <div className="space-y-3">
                <div className="bg-card rounded-2xl neu-card overflow-hidden">
                  <div className="p-4 space-y-3">
                    <form
                      onSubmit={(e) => { e.preventDefault(); void handleSearch() }}
                      className="flex gap-2"
                    >
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, email, or answer content..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-10 border-2 border-foreground/15 focus:border-indigo-500 rounded-xl"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`h-10 rounded-xl border-2 px-3 transition-all duration-200 ${showFilters ? "border-indigo-500 text-indigo-500" : "border-border"}`}
                      >
                        <Filter className="w-4 h-4 mr-1.5" />
                        Filters
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={searchLoading}
                        className="h-10 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 text-white neu-btn-press px-5"
                      >
                        {searchLoading ? "..." : "Search"}
                      </Button>
                      {isSearchActive && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearSearch}
                          className="h-10 rounded-xl border-2 border-border hover:border-destructive hover:text-destructive px-3"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </form>

                    {showFilters && (
                      <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t border-border/60 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">From Date</label>
                          <Input type="date" value={searchDateFrom} onChange={(e) => setSearchDateFrom(e.target.value)} className="h-9 border-2 border-foreground/15 focus:border-indigo-500 rounded-xl text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">To Date</label>
                          <Input type="date" value={searchDateTo} onChange={(e) => setSearchDateTo(e.target.value)} className="h-9 border-2 border-foreground/15 focus:border-indigo-500 rounded-xl text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Completion</label>
                          <select
                            title="Filter by completion status"
                            value={searchCompleted}
                            onChange={(e) => setSearchCompleted(e.target.value as "all" | "true" | "false")}
                            className="w-full h-9 border-2 border-foreground/15 focus:border-indigo-500 rounded-xl text-sm bg-background px-3"
                          >
                            <option value="all">All responses</option>
                            <option value="true">Completed (all 5 questions)</option>
                            <option value="false">Incomplete</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(() => {
                  const displayed = isSearchActive ? searchResults : responses
                  return displayed.length > 0 && (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/30 border border-primary/10">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === displayed.length && displayed.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded border-foreground/30 accent-indigo-500"
                          />
                          <span className="font-bold text-muted-foreground">
                            {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Select all (${displayed.length})`}
                          </span>
                        </label>
                        {isSearchActive && (
                          <Badge variant="secondary" className="rounded-lg px-2 py-0.5 text-xs font-bold bg-indigo-500/10 text-indigo-500">
                            Search: {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedIds.size > 0 && (
                          <Button type="button" variant="outline" size="sm" onClick={downloadSelected} className="h-8 rounded-lg border-2 border-border hover:border-indigo-500 hover:text-indigo-500 text-xs font-bold px-3">
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Download Selected ({selectedIds.size})
                          </Button>
                        )}
                        <Button type="button" variant="outline" size="sm" onClick={downloadAll} className="h-8 rounded-lg border-2 border-border hover:border-indigo-500 hover:text-indigo-500 text-xs font-bold px-3">
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Download All
                        </Button>
                      </div>
                    </div>
                  )
                })()}

                {(responsesError || searchError) && (
                  <div className="p-3 rounded-xl bg-destructive/5 border-2 border-destructive/20 text-destructive text-sm">
                    {responsesError || searchError}
                  </div>
                )}

                {(responsesLoading && responses.length === 0 && !isSearchActive) || searchLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
                    {searchLoading ? "Searching..." : "Loading responses..."}
                  </div>
                ) : (() => {
                  const displayed = isSearchActive ? searchResults : responses
                  return displayed.length === 0 && !responsesLoading ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {isSearchActive ? "No responses match your search." : "No user responses yet."}
                    </div>
                  ) : (
                    <>
                      {!isSearchActive && (
                        <div className="p-4 rounded-xl bg-secondary/30 border border-primary/10 text-sm text-muted-foreground leading-relaxed">
                          Showing <strong className="text-foreground">{responses.length}</strong> user submission{responses.length !== 1 ? "s" : ""}, newest first.
                        </div>
                      )}

                      {displayed.map((r) => {
                        const open = !!expandedResponses[r.id]
                        const audienceBadge =
                          r.audience === "individual"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : r.audience === "team"
                              ? "bg-[#8b7cf6]/10 text-[#8b7cf6] border-[#8b7cf6]/20"
                              : "bg-muted text-muted-foreground border-border"
                        return (
                          <div key={r.id} className={`bg-card rounded-2xl overflow-hidden transition-all duration-300 ${open ? "neu-card-primary" : "neu-card"}`}>
                            <div className="flex items-center">
                              <label className="flex items-center pl-4 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  title={`Select response #${r.id}`}
                                  checked={selectedIds.has(r.id)}
                                  onChange={() => toggleSelectId(r.id)}
                                  className="rounded border-foreground/30 accent-indigo-500"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => toggleResponse(r.id)}
                                className="flex-1 flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors duration-200"
                              >
                                <Badge variant="outline" className="rounded-lg bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-xs font-bold shrink-0">
                                  #{r.id}
                                </Badge>
                                <Badge variant="outline" className={`rounded-lg text-[10px] font-black uppercase shrink-0 ${audienceBadge}`}>
                                  {r.audience || "—"}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">{r.firstName || "—"}</p>
                                  <p className="text-sm text-foreground truncate mt-0.5">{r.email || "—"}</p>
                                </div>
                                <Badge variant="secondary" className={`rounded-lg text-[10px] font-bold shrink-0 mr-1 ${r.question5 ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                                  {r.question5 ? "Complete" : "Incomplete"}
                                </Badge>
                                <span className="text-xs text-muted-foreground shrink-0 mr-2">{formatDate(r.createdAt)}</span>
                                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadResponses([r])}
                                className="pr-4 pl-1 text-muted-foreground hover:text-indigo-500 transition-colors"
                                title="Download this response"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>

                            {open && (
                              <div className="border-t border-border/60 p-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1.5 border-b border-border">
                                  Answers
                                </p>
                                {[1, 2, 3, 4, 5].map((n) => {
                                  const val = r[`question${n}` as keyof typeof r] || ""
                                  const promptText = (r[`question${n}_text` as keyof typeof r] as string | undefined) || ""
                                  return (
                                    <div key={`q${n}`}>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Question {n}</label>
                                      {promptText ? (
                                        <div className="mb-2 px-3 py-2 rounded-lg bg-secondary/40 border border-border/60 text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                                          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-0.5">Prompt shown</span>
                                          {promptText}
                                        </div>
                                      ) : (
                                        <div className="mb-2 text-[12px] italic text-muted-foreground/70">
                                          Prompt text not captured (answered before this feature shipped).
                                        </div>
                                      )}
                                      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                                        {val || <span className="text-muted-foreground italic">No answer</span>}
                                      </div>
                                    </div>
                                  )
                                })}

                                <Separator />
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1.5 border-b border-border">
                                  Beat Feedback
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                  {[1, 2, 3, 4, 5].map((n) => {
                                    const val = r[`beat${n}_feedback` as keyof typeof r] || ""
                                    return (
                                      <div key={`fb${n}`}>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Beat {n}</label>
                                        <span className="text-sm px-2 py-0.5 bg-secondary rounded-lg inline-block">
                                          {val || "—"}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>

                                <Separator />
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1.5 border-b border-border">
                                  Beat Outputs
                                </p>
                                {[1, 2, 3, 4, 5].map((n) => {
                                  const val = r[`beat${n}_output` as keyof typeof r] || ""
                                  const outKey = `${r.id}-beat${n}`
                                  const outOpen = !!expandedOutputs[outKey]
                                  if (!val) return (
                                    <div key={`bo${n}`}>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Beat {n} Output</label>
                                      <span className="text-muted-foreground italic text-sm">No output</span>
                                    </div>
                                  )
                                  return (
                                    <div key={`bo${n}`}>
                                      <button
                                        type="button"
                                        onClick={() => toggleOutput(outKey)}
                                        className="flex items-center justify-between w-full mb-1.5 group"
                                      >
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">Beat {n} Output</label>
                                        <span className="text-xs text-indigo-500 group-hover:underline">
                                          {outOpen ? "Collapse" : `${val.length} chars — Click to expand`}
                                        </span>
                                      </button>
                                      {outOpen && (
                                        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words max-h-96 overflow-y-auto bg-muted/30 border border-border rounded-xl p-3 animate-in fade-in duration-200">
                                          {val}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {!isSearchActive && responsesHasMore && (
                        <div className="text-center mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-2 border-border hover:border-primary/30 px-8 neu-btn-press"
                            disabled={responsesLoading}
                            onClick={() => loadResponses(responsesCursor)}
                          >
                            {responsesLoading ? "Loading..." : "Load More"}
                          </Button>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
