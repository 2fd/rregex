// Memory cost of a massive `findAll` (every word of test/__data__/input-text.txt).
// Run in a fresh process per measurement.
//
// usage: node --expose-gc test/compat/memory.mjs <lib-dir> [--json <out>]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEsm } from './load.mjs';

if (typeof globalThis.gc !== 'function') {
  console.error('memory.mjs requires node --expose-gc');
  process.exit(2);
}

const [libDir] = process.argv.slice(2);
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
const lib = await loadEsm(libDir);
const text = readFileSync(resolve(import.meta.dirname, '../__data__/input-text.txt'), 'utf8');
const re = new lib.RRegex('\\w+');
re.findAll('warm up the code path');

const wasmBytes = () => lib.__wasm.memory.buffer.byteLength;
const snapshot = () => ({ ...process.memoryUsage(), wasm: wasmBytes() });

gc(); gc();
const before = snapshot();
const t0 = performance.now();
const matches = re.findAll(text);
const ms = performance.now() - t0;
const after = snapshot(); // includes garbage produced during the call
gc(); gc();
const retained = snapshot(); // `matches` is still alive here

const delta = (a, b) => Object.fromEntries(Object.keys(b).map((k) => [k, b[k] - a[k]]));
const out = {
  matches: matches.length,
  haystackBytes: Buffer.byteLength(text),
  ms,
  delta: delta(before, after),
  retainedDelta: delta(before, retained),
  wasmMemoryBytes: { before: before.wasm, after: retained.wasm },
};
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
