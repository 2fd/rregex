// Static server for the browser tests and benchmarks: serves the repository
// root, because the pages load `test/`, `bin/bench-cases.mjs` and `lib/`.

import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, resolve, sep } from "node:path"

export const ROOT = resolve(import.meta.dirname, "../..")

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
}

/**
 * @param {object} [options]
 * @param {(pathname: string, body: unknown) => void} [options.onPost]
 *   receives the JSON body of every POST request
 */
export function createStaticServer({ onPost } = {}) {
  return createServer(async (req, res) => {
    const send = (status, headers = {}) => res.writeHead(status, headers).end()

    try {
      const { pathname } = new URL(req.url, "http://localhost")

      if (req.method === "POST") {
        if (!onPost) return send(405)
        let body = ""
        for await (const chunk of req) body += chunk
        onPost(pathname, JSON.parse(body))
        return send(204)
      }

      if (pathname === "/") {
        return send(302, { location: "/test/browser/" })
      }

      let file = join(ROOT, decodeURIComponent(pathname))
      if (!file.startsWith(ROOT + sep)) {
        return send(403)
      }

      if ((await stat(file)).isDirectory()) {
        // relative URLs need the trailing slash
        if (!pathname.endsWith("/")) {
          return send(301, { location: `${pathname}/` })
        }
        file = join(file, "index.html")
        await stat(file)
      }

      res.writeHead(200, {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        // always serve the last build
        "cache-control": "no-store",
      })
      createReadStream(file).pipe(res)
    } catch (error) {
      send(error.code === "ENOENT" ? 404 : 400)
    }
  })
}
