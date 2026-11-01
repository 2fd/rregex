// Runs one case for both builds and the native RegExp, in the given order.
// Each case runs in a new worker, so every build starts with a clean wasm
// memory (see bin/bench-compare.mjs).

import { cases, nativeCases } from "../../bin/bench-cases.mjs"
import { measure } from "./measure.mjs"

onmessage = async ({ data: { dirs, name, order, time, data } }) => {
  try {
    const fns = {}
    for (const build of order) {
      if (build === "native") {
        fns.native = nativeCases(data).get(name)
      } else {
        const lib = await import(`${dirs[build]}/web.js`)
        await lib.default()
        fns[build] = cases(lib, data).get(name)
      }
    }

    const result = {}
    for (const build of order) {
      if (fns[build]) result[build] = measure(fns[build], time)
    }
    postMessage({ result })
  } catch (error) {
    postMessage({ error: String(error?.stack ?? error) })
  }
}
