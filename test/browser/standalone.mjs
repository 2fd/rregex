// `lib/standalone.js` is loaded by a classic <script> in standalone.html,
// it defines the global `rregex` and loads `rregex.wasm` next to it
await rregex.init()

export const { RRegex, RRegexSet } = rregex
