// Wasm linear memory growth over repeated calls on one instance.
//
// usage: node test/compat/leak.mjs <lib-dir> [--calls 100] [--json <out>]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEsm } from './load.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const [libDir] = args;
const calls = Number(opt('--calls', 100));
const jsonOut = opt('--json', null);

const lib = await loadEsm(libDir);
const text = readFileSync(resolve(import.meta.dirname, '../__data__/input-text.txt'), 'utf8');
const large = text.slice(0, Math.floor(text.length / 10));
const re = new lib.RRegex('(?<first>\\w+)\\s+(\\w+)?');
const wasmBytes = () => lib.__wasm.memory.buffer.byteLength;

const out = { calls, haystackBytes: Buffer.byteLength(large), methods: {} };
for (const method of ['find', 'findAll', 'captures', 'capturesAll']) {
  const before = wasmBytes();
  for (let i = 0; i < calls; i++) re[method](large);
  out.methods[method] = { growthBytes: wasmBytes() - before, perCallBytes: (wasmBytes() - before) / calls };
}
out.finalWasmBytes = wasmBytes();
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
