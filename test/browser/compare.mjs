// Browser version of bin/bench-compare.mjs: runs every case for base, head
// and the native RegExp, and reports the samples to `?report=<url>` (used by
// bin/bench-browser.mjs) or as `globalThis.compareResults`.
//
//   compare.html?base=/.base/lib&head=/lib&rounds=5&time=250&report=/results

import { DATA_PATH, addRound, cases, emptySamples, roundOrder, sample } from "../../bin/bench-cases.mjs"
import { browserName } from "./measure.mjs"

const params = new URLSearchParams(location.search)
const dirs = { base: params.get("base") ?? "/lib", head: params.get("head") ?? "/lib" }
const rounds = Number(params.get("rounds") ?? 5)
const time = Number(params.get("time") ?? 250)
const report = params.get("report")
const output = document.getElementById("log")
const runtime = browserName(navigator.userAgent)

document.getElementById("agent").textContent = navigator.userAgent

/** Logs to the page and to the runner. */
async function post(message) {
  output.textContent += `${message.message ?? message.type}\n`
  if (report) {
    await fetch(report, { method: "POST", body: JSON.stringify(message) })
  }
}

function runCase(name, order, data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./compare.worker.mjs", { type: "module" })
    worker.onmessage = ({ data: message }) => {
      worker.terminate()
      message.error ? reject(new Error(`${name}: ${message.error}`)) : resolve(message.result)
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(`${name}: ${event.message ?? "the worker failed"}`))
    }
    worker.postMessage({ dirs, name, order, time, data })
  })
}

try {
  const data = sample(await (await fetch(`/${DATA_PATH}`)).text())
  const head = await import(`${dirs.head}/web.js`)
  await head.default()
  const names = [...cases(head, data).keys()]

  await post({ type: "progress", message: `${runtime}: ${names.length} cases × ${rounds} rounds × ${time} ms` })

  const samples = Object.fromEntries(names.map((name) => [name, emptySamples()]))
  for (let round = 0; round < rounds; round++) {
    for (const name of names) {
      addRound(samples[name], await runCase(name, roundOrder(round), data))
    }
    await post({ type: "progress", message: `${runtime}: round ${round + 1}/${rounds} done` })
  }

  const results = { runtime, userAgent: navigator.userAgent, rounds, time, samples }
  globalThis.compareResults = results
  document.title = `✓ ${document.title}`
  await post({ type: "done", results })
} catch (error) {
  console.error(error)
  document.title = `✗ ${document.title}`
  await post({ type: "error", message: String(error?.stack ?? error) })
}
