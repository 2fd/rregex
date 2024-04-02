import { writeFileSync } from 'fs';
import { resolve } from 'path';

const jsr = resolve(process.cwd(), './jsr.json')

const metadata = JSON.stringify({
  name: cargo.package.name,
  description: cargo.package.description,
  authors: cargo.package.authors,
  homepage: cargo.package.homepage,
  repository: cargo.package.repository,
  ['regex']: lock.package.find(pkg => pkg.name === 'regex').version,
  ['regex-syntax']: lock.package.find(pkg => pkg.name === 'regex-syntax').version,
}, null, 2)

function append(path, data) {
  const dist = resolve(process.cwd(), path)
  appendFileSync(dist, '\n')
  appendFileSync(dist, data)
  appendFileSync(dist, '\n')
}

append(`./lib_web/rregex.d.ts`, `export const metadata: ${metadata}`)
append(`./lib_web/rregex.js`, `export const metadata = ${metadata}`)
append(`./lib_deno/rregex.js`, `export const metadata = ${metadata}`)
append(`./lib_bundler/rregex.js`, `export const metadata = ${metadata}`)
append(`./lib_nodejs/commonjs.cjs`, `module.exports.metadata = ${metadata}`)
