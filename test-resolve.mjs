// Registers the resolve hook below on the loader thread. Test-only: nothing in
// the app or the build loads this. See test-hooks.mjs for what it does.
import { register } from "node:module"

register("./test-hooks.mjs", import.meta.url)
