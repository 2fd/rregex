// Serves the browser tests and benchmarks. Run `node --run build` first.
//
//   PORT=8080 HOST=0.0.0.0 node test/browser/serve.mjs

import { existsSync } from "node:fs"
import { join } from "node:path"
import { ROOT, createStaticServer } from "./server.mjs"

const PORT = Number(process.env.PORT ?? 8080)
const HOST = process.env.HOST ?? "localhost"

if (!existsSync(join(ROOT, "lib/web.js"))) {
  console.warn("lib/ is missing, run `node --run build` first")
}

createStaticServer().listen(PORT, HOST, () => {
  const base = `http://${HOST}:${PORT}/test/browser`
  console.log(`web:        ${base}/`)
  console.log(`standalone: ${base}/standalone.html`)
  console.log(`benchmarks: ${base}/bench.html`)
  console.log(`base/head:  ${base}/compare.html?base=/lib&head=/lib`)
})
