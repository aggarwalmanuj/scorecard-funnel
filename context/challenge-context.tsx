"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { clearSummaryAudio } from "@/lib/client/summary-audio-cache"
import { clearBeatAudio } from "@/lib/client/beat-audio-cache"

const STORAGE_KEY = "ufa-challenge"

export type Audience = "individual" | "team"

export function isAudience(v: unknown): v is Audience {
  return v === "individual" || v === "team"
}

export interface ClarityScoreSnapshot {
  subscores: {
    directionClarity: number
    identityAlignment: number
    decisionReadiness: number
    energyAlignment: number
  }
  reasons: {
    directionClarity?: string
    identityAlignment?: string
    decisionReadiness?: string
    energyAlignment?: string
  }
  nsState?: string
}

/** Full /api/challenge/report response, cached so the downloadable PDF
 *  on the offer page renders instantly without waiting for a fresh LLM
 *  round-trip. Pre-generated in the background during the processing
 *  screen so the user never feels the latency. */
export interface ReportSnapshot {
  clarity: unknown
  reasons: unknown
  nsState?: string
  report: unknown
  scoreSource: "llm" | "fallback"
}

export interface ChallengeState {
  email: string
  firstName: string
  serialNumber: number | null
  audience: Audience | null
  currentStep: number
  responses: {
    question1: string
    question2: string
    question3: string
    question4: string
    question5: string
  }
  beats: {
    beat1: string
    beat2: string
    beat3: string
    beat4: string
    beat5: string
  }
  /** LLM-scored clarity reading — captured once (in the background during
   *  processing) so every downstream surface (summary, report PDF, offer
   *  page) shows identical numbers instead of re-rolling against the LLM. */
  clarityScore: ClarityScoreSnapshot | null
  /** Full pre-generated report payload. Populated during processing so the
   *  Download button on /offer feels instantaneous. */
  reportData: ReportSnapshot | null
  /** Full pre-generated AI summary text. Populated during processing so the
   *  journey-summary screen renders instantly without re-streaming from
   *  the LLM (and without the ECONNRESET noise that comes from aborting
   *  an in-flight stream when the user navigates away mid-page). */
  summaryText: string
  isComplete: boolean
}

interface ChallengeContextType {
  state: ChallengeState
  isHydrated: boolean
  setEmail: (email: string) => void
  setFirstName: (firstName: string) => void
  setSerialNumber: (serialNumber: number | null) => void
  setAudience: (audience: Audience | null) => void
  setResponse: (question: keyof ChallengeState["responses"], value: string) => void
  setBeat: (beat: keyof ChallengeState["beats"], value: string) => void
  setStep: (step: number) => void
  setClarityScore: (snapshot: ClarityScoreSnapshot | null) => void
  setReportData: (snapshot: ReportSnapshot | null) => void
  setSummaryText: (text: string) => void
  markComplete: () => void
  reset: () => void
}

const defaultState: ChallengeState = {
  email: "",
  firstName: "",
  serialNumber: null,
  audience: null,
  currentStep: 0,
  responses: {
    question1: "",
    question2: "",
    question3: "",
    question4: "",
    question5: "",
  },
  beats: {
    beat1: "",
    beat2: "",
    beat3: "",
    beat4: "",
    beat5: "",
  },
  clarityScore: null,
  reportData: null,
  summaryText: "",
  isComplete: false,
}

function mergeSavedState(raw: unknown): ChallengeState {
  if (!raw || typeof raw !== "object") return defaultState
  const p = raw as Partial<ChallengeState>
  return {
    ...defaultState,
    ...p,
    email: typeof p.email === "string" ? p.email : defaultState.email,
    firstName: typeof p.firstName === "string" ? p.firstName : defaultState.firstName,
    serialNumber: typeof p.serialNumber === "number" ? p.serialNumber : defaultState.serialNumber,
    audience: isAudience(p.audience) ? p.audience : defaultState.audience,
    currentStep: typeof p.currentStep === "number" ? p.currentStep : defaultState.currentStep,
    isComplete: typeof p.isComplete === "boolean" ? p.isComplete : defaultState.isComplete,
    responses: {
      ...defaultState.responses,
      ...(typeof p.responses === "object" && p.responses ? p.responses : {}),
    },
    beats: {
      ...defaultState.beats,
      ...(typeof p.beats === "object" && p.beats ? p.beats : {}),
    },
    clarityScore:
      p.clarityScore && typeof p.clarityScore === "object"
        ? (p.clarityScore as ClarityScoreSnapshot)
        : null,
    reportData:
      p.reportData && typeof p.reportData === "object"
        ? (p.reportData as ReportSnapshot)
        : null,
    summaryText: typeof p.summaryText === "string" ? p.summaryText : "",
  }
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined)

export function ChallengeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChallengeState>(defaultState)
  const [isHydrated, setIsHydrated] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        setState(mergeSavedState(JSON.parse(raw)))
      } catch {
        /* ignore corrupt */
      }
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        /* quota */
      }
    }, 250)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [state, isHydrated])

  const setEmail = (email: string) => {
    setState((prev) => ({ ...prev, email }))
  }

  const setFirstName = (firstName: string) => {
    setState((prev) => ({ ...prev, firstName }))
  }

  const setSerialNumber = (serialNumber: number | null) => {
    setState((prev) => ({ ...prev, serialNumber }))
  }

  const setAudience = (audience: Audience | null) => {
    setState((prev) => ({ ...prev, audience }))
  }

  const setResponse = (question: keyof ChallengeState["responses"], value: string) => {
    setState((prev) => ({
      ...prev,
      responses: { ...prev.responses, [question]: value },
    }))
  }

  const setBeat = useCallback((beat: keyof ChallengeState["beats"], value: string) => {
    setState((prev) => ({
      ...prev,
      beats: { ...prev.beats, [beat]: value },
    }))
  }, [])

  const setStep = useCallback((step: number) => {
    setState((prev) => {
      if (prev.currentStep === step) return prev
      return { ...prev, currentStep: step }
    })
  }, [])

  const setClarityScore = useCallback((snapshot: ClarityScoreSnapshot | null) => {
    setState((prev) => ({ ...prev, clarityScore: snapshot }))
  }, [])

  const setReportData = useCallback((snapshot: ReportSnapshot | null) => {
    setState((prev) => ({ ...prev, reportData: snapshot }))
  }, [])

  const setSummaryText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, summaryText: text }))
  }, [])

  const markComplete = useCallback(() => {
    setState((prev) => (prev.isComplete ? prev : { ...prev, isComplete: true }))
  }, [])

  const reset = () => {
    setState(defaultState)
    localStorage.removeItem(STORAGE_KEY)
    clearSummaryAudio()
    clearBeatAudio()
  }

  return (
    <ChallengeContext.Provider
      value={{
        state,
        isHydrated,
        setEmail,
        setFirstName,
        setSerialNumber,
        setAudience,
        setResponse,
        setBeat,
        setStep,
        setClarityScore,
        setReportData,
        setSummaryText,
        markComplete,
        reset,
      }}
    >
      {children}
    </ChallengeContext.Provider>
  )
}

export function useChallenge() {
  const context = useContext(ChallengeContext)
  if (context === undefined) {
    throw new Error("useChallenge must be used within a ChallengeProvider")
  }
  return context
}
