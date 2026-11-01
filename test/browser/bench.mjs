import { chart, duration, times } from "./bench-chart.mjs"
import { browserName } from "./measure.mjs"

const form = document.getElementById("options")
const run = form.elements.run
const status = document.getElementById("status")
const charts = document.getElementById("charts")
const rows = document.getElementById("results")
const markdown = document.getElementById("markdown")
const title = document.title
const browser = browserName(navigator.userAgent)
const dark = matchMedia("(prefers-color-scheme: dark)")

document.getElementById("agent").textContent = navigator.userAgent

const worker = new Worker("./bench.worker.mjs", { type: "module" })
/** results by pattern, then by operation */
const results = new Map()
let info = {}

worker.onerror = (event) => fail(event.message ?? "the worker failed to load")

worker.onmessage = ({ data: message }) => {
  switch (message.type) {
    case "ready":
      info = message
      status.textContent = `ready · regex ${message.metadata.regex} · input ${size(message.inputLength)}`
      run.disabled = false
      break

    case "start":
      info.dataLength = message.dataLength
      status.textContent = `running on ${size(message.dataLength)}…`
      break

    case "result":
      add(message)
      break

    case "done":
      status.textContent = `done · ${subtitle()}`
      markdown.value = toMarkdown()
      markdown.hidden = false
      run.disabled = false
      globalThis.benchResults = [...results.values()].flatMap((ops) => [...ops.values()])
      document.title = `✓ ${title}`
      break

    case "error":
      fail(message.message)
      break
  }
}

form.onsubmit = (event) => {
  event.preventDefault()
  results.clear()
  charts.replaceChildren()
  rows.replaceChildren()
  markdown.hidden = true
  run.disabled = true
  document.title = title
  worker.postMessage({
    time: Number(form.elements.time.value),
    fraction: Number(form.elements.fraction.value),
  })
}

// page theme: auto follows the OS, light/dark also set the exported images
form.elements.theme.onchange = () => {
  const { value } = form.elements.theme
  if (value === "auto") {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = value
  }
  renderCharts()
}
dark.onchange = renderCharts

function theme() {
  return document.documentElement.dataset.theme ?? (dark.matches ? "dark" : "light")
}

function add({ pattern, operation, engine, mean, rme }) {
  if (!results.has(pattern)) {
    results.set(pattern, new Map())
  }
  const operations = results.get(pattern)
  if (!operations.has(operation)) {
    const row = document.createElement("tr")
    row.innerHTML = "<td></td><td></td><td></td><td></td><td></td>"
    row.cells[0].textContent = pattern
    row.cells[1].textContent = operation
    rows.append(row)
    operations.set(operation, { pattern, operation, row })
  }

  const result = operations.get(operation)
  result[engine] = { mean, rme }
  result.row.cells[engine === "RegExp" ? 2 : 3].textContent = `${duration(mean)} ±${rme.toFixed(1)}%`
  if (result.RegExp && result.RRegex) {
    result.row.cells[4].textContent = summary(result)
  }

  renderChart(pattern)
}

function renderCharts() {
  for (const pattern of results.keys()) {
    renderChart(pattern)
  }
}

function renderChart(pattern) {
  let figure = document.getElementById(`chart-${pattern}`)
  if (!figure) {
    figure = document.createElement("figure")
    figure.id = `chart-${pattern}`
    figure.innerHTML =
      '<div class="svg"></div><figcaption>' +
      '<button type="button" data-format="svg">download svg</button> ' +
      '<button type="button" data-format="png">download png</button></figcaption>'
    figure.querySelectorAll("button").forEach((button) => {
      button.onclick = () => download(pattern, button.dataset.format)
    })
    charts.append(figure)
  }
  figure.querySelector(".svg").innerHTML = svg(pattern)
}

function svg(pattern, mode = theme()) {
  const rows = [...results.get(pattern).values()]
  return chart({ pattern, rows, theme: mode, subtitle: subtitle() })
}

async function download(pattern, format) {
  const mode = theme()
  const name = `rregex-vs-native-${pattern}-${mode}.${format}`
  let blob = new Blob([svg(pattern, mode)], { type: "image/svg+xml" })

  if (format === "png") {
    // rasterize at 2x for high density screens
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth * 2
    canvas.height = image.naturalHeight * 2
    const context = canvas.getContext("2d")
    context.scale(2, 2)
    context.drawImage(image, 0, 0)
    URL.revokeObjectURL(url)
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"))
  }

  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
  URL.revokeObjectURL(link.href)
}

function toMarkdown() {
  const lines = [
    `> ${navigator.userAgent}`,
    `> regex ${info.metadata.regex}, input ${size(info.dataLength)}`,
    "",
    "| pattern | operation | RegExp | RRegex | summary |",
    "| ------- | --------- | -----: | -----: | ------- |",
  ]
  for (const operations of results.values()) {
    for (const result of operations.values()) {
      lines.push(
        `| ${result.pattern} | \`${result.operation}\` | ${duration(result.RegExp.mean)} | ` +
          `${duration(result.RRegex.mean)} | ${summary(result, "`")} |`,
      )
    }
  }
  return lines.join("\n")
}

/** RRegex relative to the native RegExp, like the chart. */
function summary({ RegExp, RRegex }, quote = "") {
  const faster = RRegex.mean <= RegExp.mean
  const ratio = faster ? RegExp.mean / RRegex.mean : RRegex.mean / RegExp.mean
  return `${quote}RRegex${quote} ${times(ratio)} ${faster ? "faster" : "slower"}`
}

function subtitle() {
  return `${browser} · input ${size(info.dataLength)} · regex ${info.metadata.regex}`
}

function size(chars) {
  return chars >= 1e6 ? `${(chars / 1e6).toFixed(1)}M chars` : `${Math.round(chars / 1e3)}K chars`
}

function fail(message) {
  console.error(message)
  status.textContent = "failed"
  const pre = document.createElement("pre")
  pre.className = "error"
  pre.textContent = message
  status.after(pre)
  run.disabled = false
}
