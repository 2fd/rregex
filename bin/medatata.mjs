import { readFileSync, appendFileSync } from 'fs';
import { resolve } from 'path';
import toml from 'toml';

const cargo = toml.parse(readFileSync(resolve(process.cwd(), './Cargo.toml')))
const lock = toml.parse(readFileSync(resolve(process.cwd(), './Cargo.lock')))

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

append(`./lib_web/rregex.d.ts`, `/** Build metadata */\nexport const metadata: ${metadata}`)
append(`./lib_nodejs/rregex.d.ts`, `/** Build metadata */\nexport const metadata: ${metadata}`)
append(`./lib_no_modules/rregex.d.ts`, `/** Build metadata */\nexport const metadata: ${metadata}`)
append(`./lib_web/rregex.js`, `/** Build metadata */\nexport const metadata = ${metadata}`)
append(`./lib_deno/rregex.js`, `/** Build metadata */\nexport const metadata = ${metadata}`)
append(`./lib_cf/cf.mjs`, `/** Build metadata */\nexport const metadata = ${metadata}`)
append(`./lib_nodejs/commonjs.cjs`, `/** Build metadata */\nmodule.exports.metadata = ${metadata}`)
