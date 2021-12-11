const { readFileSync, writeFileSync, appendFileSync } = require('fs')
const { resolve } = require('path')
const toml = require('toml')

const cargo = toml.parse(readFileSync(resolve(__dirname, '../Cargo.toml')))
const lock = toml.parse(readFileSync(resolve(__dirname, '../Cargo.lock')))

const metadata = JSON.stringify({
  name: cargo.package.name,
  description: cargo.package.description,
  authors: cargo.package.authors,
  homepage: cargo.package.homepage,
  repository: cargo.package.repository,
  ['regex']: lock.package.find(package => package.name === 'regex').version,
  ['regex-syntax']: lock.package.find(package => package.name === 'regex-syntax').version,
}, null, 2)


const types = [
  'browser.d.ts',
  'commonjs.d.ts',
  'module.d.ts',
  'types.d.ts',
]

for (const t of types) {
  appendFileSync(resolve(__dirname, `../lib/${t}`), `
export const metadata: ${metadata}
`)
}

appendFileSync(resolve(__dirname, `../lib/module.js`), `
export const metadata = ${metadata}
`)

appendFileSync(resolve(__dirname, `../lib/commonjs.js`), `
module.exports.metadata = ${metadata}
`)

appendFileSync(resolve(__dirname, `../lib/browser.js`), `
export const metadata = ${metadata}
`)
