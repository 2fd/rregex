// `lib/standalone.js` is loaded by a classic <script> in standalone.html,
// it defines the global `wasm_bindgen` and loads `rregex.wasm` next to it
await wasm_bindgen()

export const { RRegex, RRegexSet } = wasm_bindgen
