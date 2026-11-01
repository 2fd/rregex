// Runs the RegExp vs RRegex benchmarks off the main thread, with the cases
// of bin/bench-cases.mjs that have a native equivalent.

import init, { RRegex, RRegexSet, metadata } from "../../lib/web.js"
import { DATA_PATH, cases, nativeCases } from "../../bin/bench-cases.mjs"
import { measure } from "./measure.mjs"

const [input] = await Promise.all([fetch(`/${DATA_PATH}`).then((res) => res.text()), init()])

postMessage({ type: "ready", metadata, inputLength: input.length })

onmessage = ({ data: { time, fraction } }) => {
  try {
    const data = input.slice(0, Math.floor(input.length * fraction))
    postMessage({ type: "start", dataLength: data.length })

    const rregex = cases({ RRegex, RRegexSet }, data)
    for (const [name, native] of nativeCases(data)) {
      const [pattern, operation] = name.split(": ")
      const engines = { RegExp: native, RRegex: rregex.get(name) }
      for (const [engine, fn] of Object.entries(engines)) {
        postMessage({ type: "result", pattern, operation, engine, ...measure(fn, time) })
      }
    }

    postMessage({ type: "done" })
  } catch (error) {
    postMessage({ type: "error", message: String(error?.stack ?? error) })
  }
}
