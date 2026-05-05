/**
 * Microsoft Clarity singleton — handles dynamic import, init, and identify.
 *
 * Why dynamic import: keeps the SDK out of the main bundle. The module is
 * only fetched once a real init call lands in the browser.
 *
 * Why a queueing identifyClarity: the very first signup happens BEFORE
 * the deferred Clarity script has finished loading on slow connections.
 * Awaiting the init promise inside identify ensures every email gets
 * tagged onto the correct session even if the SDK hasn't booted yet.
 *
 * Server-only: the project ID is read in a Server Component and passed
 * down as a prop, so it never appears in the bundle as `NEXT_PUBLIC_*`.
 * That keeps it consistent with the convention across our funnels.
 */
type ClarityModule = typeof import("@microsoft/clarity").default

let modulePromise: Promise<ClarityModule> | null = null
let initPromise: Promise<void> | null = null
let initializedProjectId: string | null = null

function loadModule(): Promise<ClarityModule> {
  if (typeof window === "undefined")
    return Promise.reject(new Error("Clarity is browser-only"))
  if (!modulePromise)
    modulePromise = import("@microsoft/clarity").then((m) => m.default)
  return modulePromise
}

export function initClarity(projectId: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (!projectId) return Promise.resolve()
  if (initializedProjectId === projectId && initPromise) return initPromise

  initPromise = loadModule()
    .then((Clarity) => {
      Clarity.init(projectId)
      try {
        // Privacy policy already covers analytics consent — grant
        // unconditionally instead of stalling behind a banner. Older SDK
        // builds may not expose consentV2; tolerate via try/catch.
        Clarity.consentV2({
          ad_Storage: "granted",
          analytics_Storage: "granted",
        })
      } catch {
        /* older SDKs may not have consentV2 */
      }
      initializedProjectId = projectId
    })
    .catch((err) => {
      initPromise = null
      // eslint-disable-next-line no-console
      console.warn("[clarity] init failed", err)
    })

  return initPromise
}

export async function identifyClarity(
  email: string,
  firstName?: string,
): Promise<void> {
  if (typeof window === "undefined" || !email) return
  try {
    if (initPromise) await initPromise
    const Clarity = await loadModule()
    Clarity.identify(email, undefined, undefined, firstName || undefined)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[clarity] identify failed", err)
  }
}
