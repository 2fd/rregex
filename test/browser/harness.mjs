// Browser stand-in for `node:test`: collects the tests, runs them in order
// and renders the report. The results are also published as
// `globalThis.testResults` and in the page title, for scripted checks.

const tests = []

export function test(name, fn) {
  tests.push({ name, fn })
}

/** Loads the suite with `load`, runs every test and renders the report. */
export async function run(load) {
  const report = document.getElementById("report")
  const results = []

  try {
    await load()
  } catch (error) {
    console.error(error)
    publish({ passed: 0, failed: 1, total: 1, error: String(error) })
    report.replaceChildren(failure("loading the suite", error))
    return
  }

  for (const { name, fn } of tests) {
    const start = performance.now()
    try {
      await fn()
      results.push({ name, ok: true, ms: performance.now() - start })
    } catch (error) {
      console.error(name, error)
      results.push({ name, ok: false, ms: performance.now() - start, error })
    }
  }

  const failed = results.filter((result) => !result.ok)
  publish({
    passed: results.length - failed.length,
    failed: failed.length,
    total: results.length,
    failures: failed.map(({ name, error }) => ({ name, error: String(error) })),
  })

  const summary = document.createElement("p")
  summary.className = failed.length ? "summary fail" : "summary pass"
  summary.textContent = `${results.length - failed.length}/${results.length} passed`

  const list = document.createElement("ol")
  for (const result of results) {
    const item = document.createElement("li")
    item.className = result.ok ? "pass" : "fail"
    item.textContent = `${result.ok ? "✓" : "✗"} ${result.name} (${result.ms.toFixed(1)} ms)`
    if (!result.ok) {
      item.append(failure(null, result.error))
    }
    list.append(item)
  }

  report.replaceChildren(summary, ...failed.map((f) => failure(f.name, f.error)), list)
}

function publish(results) {
  globalThis.testResults = results
  document.title = `${results.failed ? "✗" : "✓"} ${results.passed}/${results.total} · ${document.title}`
  console.log(`${results.passed}/${results.total} passed`)
}

function failure(name, error) {
  const pre = document.createElement("pre")
  pre.className = "error"
  pre.textContent = `${name ? `${name}\n` : ""}${error?.stack ?? error}`
  return pre
}
