import { run } from "./harness.mjs"

const agent = document.getElementById("agent")
agent.textContent = navigator.userAgent

// the import map of the page resolves `node:test`, `node:assert` and
// `../lib/esm.mjs` to their browser versions
await run(() => import("../node.test.mjs"))
