// Renders the benchmark results of one pattern as a self-contained SVG: no CSS
// variables or external fonts, so the same markup is shown on the page and
// exported as SVG/PNG for the README.
//
// Each operation has a pair of bars of calls per second (longer is faster),
// scaled to the faster engine of that operation, and the verdict on the right.

export const ENGINES = ["RegExp", "RRegex"]

// categorical slots 1 and 2 of the dataviz reference palette, validated for
// CVD separation and contrast on each surface
export const THEMES = {
  light: {
    surface: "#fcfcfb",
    text: "#0b0b0b",
    secondary: "#52514e",
    muted: "#8a8984",
    rule: "#e4e3df",
    RegExp: "#2a78d6",
    RRegex: "#eb6834",
  },
  dark: {
    surface: "#1a1a19",
    text: "#f0efec",
    secondary: "#c3c2b7",
    muted: "#8a8984",
    rule: "#383835",
    RegExp: "#3987e5",
    RRegex: "#d95926",
  },
}

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const WIDTH = 760
const PAD = 32
const LABEL = 132 // operation and engine labels
const VERDICT = 190 // verdict column
const BAR = 16
const GAP = 2 // surface gap between the bars of a pair
const MIN_BAR = 4 // a bar is always visible, even at 20000x slower
const GROUP = 2 * BAR + GAP + 44 // pair + operation name + space around the divider
const HEADER = 128
const PILL_WIDTH = 150
const PILL_HEIGHT = 26

/**
 * @param {object} options
 * @param {string} options.pattern  pattern name, e.g. "email"
 * @param {{ operation: string, RegExp?: Result, RRegex?: Result }[]} options.rows
 * @param {"light" | "dark"} options.theme
 * @param {string} options.subtitle  browser, input size, regex version
 */
export function chart({ pattern, rows, theme, subtitle }) {
  const c = THEMES[theme]
  const plot = WIDTH - 2 * PAD - LABEL - VERDICT
  const height = HEADER + rows.length * GROUP + PAD / 2

  const out = []
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" ` +
      `width="${WIDTH}" height="${height}" font-family="${FONT}" role="img" ` +
      `aria-label="${esc(`RRegex vs RegExp: ${pattern}`)}">`,
    `<rect width="${WIDTH}" height="${height}" rx="12" fill="${c.surface}"/>`,
    text(PAD, PAD + 20, `RRegex vs RegExp: ${pattern}`, { size: 24, weight: 700, fill: c.text }),
    text(PAD, PAD + 44, subtitle, { size: 12, fill: c.muted }),
  )

  // legend, the bars are also direct-labeled
  let x = PAD
  const legendY = PAD + 68
  for (const engine of ENGINES) {
    out.push(`<rect x="${x}" y="${legendY - 10}" width="12" height="12" rx="3" fill="${c[engine]}"/>`)
    out.push(text(x + 18, legendY, engine, { size: 13, fill: c.secondary }))
    x += 92
  }
  out.push(
    text(WIDTH - PAD, legendY, "calls per second · longer is faster", {
      size: 12,
      fill: c.muted,
      anchor: "end",
    }),
  )

  rows.forEach((row, i) => {
    const top = HEADER + i * GROUP
    const fastest = Math.max(...ENGINES.map((engine) => hz(row[engine]) ?? 0))

    if (i > 0) {
      out.push(`<line x1="${PAD}" x2="${WIDTH - PAD}" y1="${top - 12}" y2="${top - 12}" stroke="${c.rule}"/>`)
    }
    out.push(text(PAD, top + 12, row.operation, { size: 14, weight: 600, fill: c.text }))

    ENGINES.forEach((engine, j) => {
      const y = top + 20 + j * (BAR + GAP)
      const middle = y + BAR / 2
      out.push(text(PAD + LABEL - 12, middle, engine, { size: 12, fill: c.secondary, anchor: "end", middle: true }))

      const result = row[engine]
      if (!result) {
        out.push(text(PAD + LABEL, middle, "running…", { size: 12, fill: c.muted, middle: true }))
        return
      }

      const width = Math.max(MIN_BAR, (plot * hz(result)) / fastest)
      out.push(
        `<path d="${bar(PAD + LABEL, y, width, BAR)}" fill="${c[engine]}">` +
          `<title>${esc(tooltip(engine, row.operation, result))}</title></path>`,
      )
    })

    if (row.RegExp && row.RRegex) {
      // RRegex relative to the native RegExp: a status pill (color, arrow and
      // word), centered on the pair
      const faster = row.RRegex.mean <= row.RegExp.mean
      const ratio = faster ? row.RegExp.mean / row.RRegex.mean : row.RRegex.mean / row.RegExp.mean
      const verdict = `${faster ? "▲" : "▼"} ${times(ratio)} ${faster ? "faster" : "slower"}`
      const middle = top + 20 + BAR + GAP / 2
      const x = WIDTH - PAD - PILL_WIDTH
      // faster: solid pill in high contrast, slower: outline with muted text.
      // The fill tells them apart, not the hue (red/green fails for CVD).
      const pill = faster
        ? `fill="${c.text}"`
        : `fill="none" stroke="${c.muted}" stroke-width="1.5"`
      out.push(
        `<g><title>${esc(`RRegex is ${times(ratio)} ${faster ? "faster" : "slower"} than RegExp`)}</title>` +
          `<rect x="${x}" y="${middle - PILL_HEIGHT / 2}" width="${PILL_WIDTH}" height="${PILL_HEIGHT}" ` +
          `rx="${PILL_HEIGHT / 2}" ${pill}/>` +
          text(x + PILL_WIDTH / 2, middle, verdict, {
            size: 14,
            weight: 700,
            fill: faster ? c.surface : c.secondary,
            anchor: "middle",
            middle: true,
          }) +
          "</g>",
      )
    }
  })

  out.push("</svg>")
  return out.join("")
}

/** Calls per second. */
export function hz(result) {
  return result ? 1000 / result.mean : undefined
}

export function times(ratio) {
  if (ratio >= 100) return `${Math.round(ratio).toLocaleString("en-US")}×`
  if (ratio >= 10) return `${ratio.toFixed(1)}×`
  return `${ratio.toFixed(2)}×`
}

export function duration(ms) {
  if (ms >= 1) return `${ms.toFixed(2)} ms`
  if (ms >= 1e-3) return `${(ms * 1e3).toFixed(2)} µs`
  return `${(ms * 1e6).toFixed(1)} ns`
}

function tooltip(engine, operation, { mean, rme }) {
  const perSecond = Math.round(1000 / mean).toLocaleString("en-US")
  return `${engine} · ${operation}\n${duration(mean)} per call (±${rme.toFixed(1)}%)\n${perSecond} calls/s`
}

/** A bar anchored on the left, with the data end (right) rounded. */
function bar(x, y, width, height) {
  const r = Math.min(4, width / 2, height / 2)
  return (
    `M${x},${y}h${width - r}a${r},${r} 0 0 1 ${r},${r}v${height - 2 * r}` +
    `a${r},${r} 0 0 1 ${-r},${r}h${r - width}z`
  )
}

function text(x, y, content, { size, weight = 400, fill, anchor = "start", middle = false }) {
  // `middle`: y is the vertical center of the text, not its baseline
  return (
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" ` +
    `text-anchor="${anchor}"${middle ? ' dominant-baseline="central"' : ""}>${esc(content)}</text>`
  )
}

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`)
}
