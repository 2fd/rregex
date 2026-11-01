// Timing loop for the browser benchmarks.
//
// Browsers reduce the resolution of `performance.now()` (100 µs to 1 ms), so
// each sample times a batch of calls that takes at least MIN_BATCH_MS and the
// time per call is the batch time divided by the batch size.

const MIN_BATCH_MS = 5
const MIN_SAMPLES = 5

// keeps the results alive, so the engine cannot drop the calls
let sink

/**
 * Returns the mean time per call (ms) and its relative margin of error (%).
 * The function first runs for `warmup` ms (like tinybench), so a new worker
 * measures the optimized code and not the baseline tier of JS and wasm.
 */
export function measure(fn, time, warmup = Math.min(100, time)) {
  // calibrate the batch size
  let batch = 1
  while (timeBatch(fn, batch) < MIN_BATCH_MS) {
    batch *= 2
  }

  const warm = performance.now() + warmup
  while (performance.now() < warm) {
    timeBatch(fn, batch)
  }

  const samples = []
  const end = performance.now() + time
  while (performance.now() < end || samples.length < MIN_SAMPLES) {
    samples.push(timeBatch(fn, batch) / batch)
  }

  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (samples.length - 1)
  const rme = ((1.96 * Math.sqrt(variance / samples.length)) / mean) * 100

  return { mean, rme, samples: samples.length, calls: samples.length * batch }
}

function timeBatch(fn, batch) {
  const start = performance.now()
  for (let i = 0; i < batch; i++) {
    sink = fn()
  }
  return performance.now() - start
}

/** "Chrome 150", "Firefox 144", "Safari 26"… */
export function browserName(agent) {
  // order matters: Edge and Chrome also say "Safari", Edge also says "Chrome"
  const browsers = [
    ["Firefox", /Firefox\/(\d+)/],
    ["Edge", /Edg\/(\d+)/],
    ["Chrome", /Chrome\/(\d+)/],
    ["Safari", /Version\/(\d+).*Safari/],
  ]
  for (const [name, regex] of browsers) {
    const match = agent.match(regex)
    if (match) return `${name} ${match[1]}`
  }
  return "unknown browser"
}
