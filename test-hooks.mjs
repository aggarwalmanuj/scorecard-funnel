// Resolve hook for `npm test`.
//
// Node's test runner executes the real source files, but it does not read
// tsconfig's `paths`, so the project's own "@/..." imports fail to resolve.
// This maps "@/x" to "<repo>/x" exactly as tsconfig does, and adds the ".ts"
// extension Node needs to find the file on disk.
//
// Test-only: nothing in the app or the build loads this.

import { pathToFileURL } from "node:url"
import { existsSync } from "node:fs"
import path from "node:path"

const ROOT = path.dirname(new URL(import.meta.url).pathname)

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = path.join(ROOT, specifier.slice(2))
    for (const candidate of [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      path.join(base, "index.ts"),
    ]) {
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true }
      }
    }
  }
  return nextResolve(specifier, context)
}
