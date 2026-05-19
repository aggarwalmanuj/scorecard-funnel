/**
 * Persistent cache for per-beat (1-5) TTS audio.
 *
 * Mirrors the structure of `summary-audio-cache.ts` but stores the xAI Grok
 * voice instead of ElevenLabs, and keys by `${beatNumber}::${beatText}` so
 * the five beats coexist in the same store and a re-rolled beat (different
 * text) is treated as a cache miss.
 *
 * Why a separate file/store: the summary cache aggressively clears itself on
 * write to keep only the latest entry (one summary per run). Beats are five
 * concurrent entries that must all survive between /processing and each
 * /beat-N page — they need their own store with its own retention policy.
 */

const DB_NAME = "scorecard-funnel-beats"
const DB_VERSION = 1
const STORE = "beatAudio"

type BeatNumber = 1 | 2 | 3 | 4 | 5

const memCache = new Map<string, Promise<ArrayBuffer | null>>()

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined"
}

function cacheKey(beatNumber: BeatNumber, text: string): string {
  return `${beatNumber}::${text}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key: string): Promise<ArrayBuffer | null> {
  if (!isBrowser()) return null
  try {
    const db = await openDb()
    return await new Promise<ArrayBuffer | null>((resolve) => {
      const tx = db.transaction(STORE, "readonly")
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => {
        const v = req.result
        resolve(v instanceof ArrayBuffer ? v : null)
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function idbSet(key: string, value: ArrayBuffer): Promise<void> {
  if (!isBrowser()) return
  try {
    const db = await openDb()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    })
  } catch {
    /* ignore */
  }
}

async function idbClear(): Promise<void> {
  if (!isBrowser()) return
  try {
    const db = await openDb()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    })
  } catch {
    /* ignore */
  }
}

async function fetchTts(text: string): Promise<ArrayBuffer | null> {
  if (!text.trim()) return null
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Beats 1-5 use the xAI Grok voice — distinct from the summary's
      // ElevenLabs voice on purpose, so the closing summary feels like a
      // different voice "wrapping up" the five reflections.
      body: JSON.stringify({ beatContent: text, provider: "xai" }),
    })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return buf.byteLength > 0 ? buf : null
  } catch {
    return null
  }
}

/**
 * Kick off TTS generation for the given beat — or short-circuit to a
 * persisted IDB entry if the same (beatNumber, text) pair was already
 * TTS'd. Idempotent within a session.
 */
export function preloadBeatAudio(
  beatNumber: BeatNumber,
  text: string,
): Promise<ArrayBuffer | null> {
  const key = cacheKey(beatNumber, text)
  const existing = memCache.get(key)
  if (existing) return existing
  const promise = (async () => {
    const persisted = await idbGet(key)
    if (persisted) return persisted
    const fresh = await fetchTts(text)
    if (fresh) await idbSet(key, fresh)
    return fresh
  })()
  memCache.set(key, promise)
  return promise
}

/** Drop both layers — called by reset() of the challenge state. */
export function clearBeatAudio(): void {
  memCache.clear()
  void idbClear()
}
