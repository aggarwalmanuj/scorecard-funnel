import "server-only"
import { PostHog } from "posthog-node"

/**
 * Server-side PostHog singleton.
 *
 * Why singleton: posthog-node batches events in-memory and flushes on a
 * timer. Constructing a fresh client per request (as the docs' first
 * example shows) would either drop events that never get flushed or
 * force `await posthog.shutdown()` in every handler — slow and easy to
 * forget. A module-level singleton survives across requests within a
 * single Node/Edge instance and the SDK's own flush loop handles
 * delivery. We still expose `flushPostHog()` for cases where the caller
 * genuinely needs the event on disk before responding (e.g. webhook
 * confirmations) or in short-lived serverless invocations where the
 * process may die before the next flush tick.
 *
 * Why `server-only`: prevents accidental client import. The Node SDK is
 * Node-only and pulling it into a client bundle would bloat the chunk
 * and break SSR.
 *
 * Gracefully no-ops when the env var is missing so preview builds don't
 * crash on boot.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST

let client: PostHog | null = null

export function getPostHogServer(): PostHog | null {
  if (!POSTHOG_KEY) return null
  if (client) return client

  client = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    // Tighter than the SDK default (20s / 20 events). Funnel events are
    // low-volume and we'd rather pay a tiny per-request flush than lose
    // events when a serverless container freezes.
    flushAt: 1,
    flushInterval: 0,
  })

  return client
}

/**
 * Force-flush pending events. Call before returning from a serverless
 * handler when the event MUST be delivered (payments, webhooks, etc.).
 */
export async function flushPostHog(): Promise<void> {
  if (!client) return
  try {
    await client.flush()
  } catch {
    /* swallow — telemetry must never break the request path */
  }
}
