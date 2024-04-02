import { readFileSync, writeFileSync } from 'node:fs';
import { argv } from 'node:process';
import { resolve } from 'path';

if (!argv[2]) {
  console.error('usage: jsr <version>')
  process.exit(1)
}

const path  = resolve(process.cwd(), './jsr.json')
const jsr = JSON.parse(readFileSync(path))
jsr.version = argv[2]
writeFileSync(path, JSON.stringify(jsr, null, 2))
