"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Safari-safe audio playback for our preloaded TTS bytes.
 *
 * Why this exists (and not the previous Web Audio API impl):
 * Safari macOS strips the user-activation flag the moment an awaited
 * promise yields. The old impl called `new AudioContext()` and
 * `ctx.resume()` AFTER `await fetchAudioBytes()`, so by the time the
 * AudioContext needed permission the gesture was gone and `resume()`
 * rejected with NotAllowedError — leaving the Listen button stuck on
 * "Preparing audio…" and the rest of the UI looking broken to the user.
 *
 * This hook:
 *  1. Accepts an ArrayBuffer producer (the TTS fetch / IDB cache).
 *  2. When the bytes arrive, eagerly builds a Blob URL and assigns it
 *     to an `<audio>` element so playback is "primed."
 *  3. Exposes `play()`/`stop()` callbacks that run their critical work
 *     synchronously inside the user's click handler — no awaits, so
 *     Safari's gesture attribution is preserved.
 *  4. Revokes the Blob URL on unmount to avoid leaks.
 *
 * HTML5 `<audio>` is intentionally chosen over Web Audio API: it has
 * none of the AudioContext lifecycle (`suspended`/`closed`) traps, the
 * same autoplay rules apply identically across browsers, and the bytes
 * never need to round-trip through `decodeAudioData` (which Safari has
 * historically detached buffers from — see the `slice(0)` workaround in
 * the old code).
 */
export interface UseAudioPlaybackResult {
  /** True between `play()` and `ended` (or `stop()`). */
  isPlaying: boolean
  /** True while we're waiting on the buffer for the first time. */
  isLoading: boolean
  /** True once the Blob URL has been set on the audio element. */
  isReady: boolean
  /** Human-readable error to surface in the UI, or null. */
  error: string | null
  /**
   * Toggle playback. Safe to call from a synchronous click handler —
   * the actual `audio.play()` call runs in this same task, so Safari
   * attributes it to the active user gesture.
   */
  toggle: () => void
  /** Returns the underlying ArrayBuffer for download flows. */
  getBytes: () => ArrayBuffer | null
}

export function useAudioPlayback(opts: {
  /** When this changes, the previously-loaded blob URL is revoked and a new fetch is kicked off. */
  cacheKey: string
  /** Returns the audio bytes for the current cacheKey, or null if unavailable. */
  fetchBytes: () => Promise<ArrayBuffer | null>
  /** MIME type for the Blob constructor. Defaults to audio/mpeg. */
  mimeType?: string
  /** Whether the consumer wants playback to be possible at all (e.g. text loaded). */
  enabled?: boolean
}): UseAudioPlaybackResult {
  const { cacheKey, fetchBytes, mimeType = "audio/mpeg", enabled = true } = opts

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const bytesRef = useRef<ArrayBuffer | null>(null)
  // Track which cacheKey the current blob URL was built for so a stale
  // (text-changed) buffer never plays on the new screen.
  const loadedKeyRef = useRef<string | null>(null)

  // Initialise the <audio> element once (lazy, browser-only).
  const getEl = useCallback((): HTMLAudioElement | null => {
    if (typeof window === "undefined") return null
    if (audioElRef.current) return audioElRef.current
    const el = new Audio()
    el.preload = "auto"
    el.onended = () => setIsPlaying(false)
    el.onpause = () => {
      // Safari fires `pause` when playback finishes too, but `onended`
      // already handles that. Only flip the flag when the user paused
      // mid-stream and `currentTime` < `duration`.
      if (el.duration > 0 && el.currentTime < el.duration) {
        setIsPlaying(false)
      }
    }
    el.onerror = () => {
      setIsPlaying(false)
      setError("Audio playback failed. Please try again.")
    }
    audioElRef.current = el
    return el
  }, [])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      audioElRef.current?.pause()
      audioElRef.current = null
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      bytesRef.current = null
      loadedKeyRef.current = null
    }
  }, [])

  // Whenever the cacheKey changes (or playback becomes enabled), drop
  // the previous blob and fetch fresh bytes for the new key.
  useEffect(() => {
    if (!enabled || !cacheKey) return
    if (loadedKeyRef.current === cacheKey && bytesRef.current) {
      setIsReady(true)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setIsReady(false)
    setError(null)

    void fetchBytes()
      .then((buffer) => {
        if (cancelled) return
        if (!buffer) {
          setIsLoading(false)
          // Don't set an error here — autoplay-style flows just want to
          // know "no audio available yet"; the consumer can show a
          // friendlier message if they want.
          return
        }
        bytesRef.current = buffer
        loadedKeyRef.current = cacheKey

        // Revoke any previous URL before minting a new one.
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
        }
        const blob = new Blob([buffer.slice(0)], { type: mimeType })
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url

        const el = getEl()
        if (el) {
          el.src = url
          // Calling `load()` primes the element so Safari has the
          // media available the moment the user clicks. Without this,
          // the first click sometimes ignores `play()` because the
          // resource hasn't started buffering.
          try {
            el.load()
          } catch {
            /* ignore — older Safari occasionally throws here */
          }
          setIsReady(true)
        }
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setIsLoading(false)
        setError("Audio could not be loaded. Please try again.")
      })

    return () => {
      cancelled = true
    }
    // fetchBytes intentionally not in deps — it's a closure that changes
    // every render but the cacheKey already encodes the relevant input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled, mimeType])

  const toggle = useCallback(() => {
    const el = getEl()
    if (!el) return

    if (isPlaying) {
      // Pause is unconditionally allowed and doesn't need a gesture.
      try {
        el.pause()
      } catch {
        /* ignore */
      }
      setIsPlaying(false)
      return
    }

    if (!el.src) {
      // Not ready yet — surface a soft error rather than silently no-op.
      // The button visual state already reflects loading, so this branch
      // is mostly defensive.
      setError("Audio is still loading…")
      return
    }

    setError(null)
    // Safari requirement: call `play()` SYNCHRONOUSLY inside the click
    // handler. The returned promise can resolve later, but the call
    // itself must happen in the same microtask as the user gesture.
    const result = el.play()
    if (result && typeof result.then === "function") {
      result
        .then(() => setIsPlaying(true))
        .catch((err: unknown) => {
          const name = err instanceof Error ? err.name : ""
          if (name === "AbortError") return
          // NotAllowedError fires when the call was an *autoplay attempt*
          // (not in a real user gesture). Safari is aggressive about this
          // and rejects most programmatic play() calls. Stay silent — the
          // Listen button remains visible and the user can click it.
          // A second click WILL count as a gesture and play will succeed.
          if (name === "NotAllowedError") {
            setIsPlaying(false)
            return
          }
          setIsPlaying(false)
          setError("Audio could not be played. Please try again.")
        })
    } else {
      // Older browsers return undefined from play(); assume success and
      // rely on onended/onpause to reset isPlaying.
      setIsPlaying(true)
    }
  }, [isPlaying, getEl])

  const getBytes = useCallback(() => bytesRef.current, [])

  return { isPlaying, isLoading, isReady, error, toggle, getBytes }
}

/**
 * Trigger a download of an ArrayBuffer as a file. Safari-safe:
 * the anchor is created, clicked, and removed inside the calling
 * synchronous task so the active user gesture is preserved.
 *
 * Returns true on success, false if the buffer was empty.
 */
export function downloadArrayBufferAsFile(args: {
  buffer: ArrayBuffer | null
  filename: string
  mimeType?: string
}): boolean {
  const { buffer, filename, mimeType = "audio/mpeg" } = args
  if (!buffer || buffer.byteLength === 0) return false
  if (typeof window === "undefined") return false

  const blob = new Blob([buffer.slice(0)], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  // The element must be in the DOM for `click()` to dispatch in
  // Safari ≤14. Modern browsers don't require it but appending is
  // cheap insurance.
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Defer revocation so the browser has time to start the download.
  // Without this, Safari sometimes cancels the download mid-flight.
  setTimeout(() => URL.revokeObjectURL(url), 1500)
  return true
}
