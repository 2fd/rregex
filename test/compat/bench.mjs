// Throughput benchmark of the APIs that build JS values (Match / Captures / Hir).
//
// usage: node test/compat/bench.mjs <lib-dir> [--json <out>] [--time <ms>] [--task <name>] [--list]
//
// Run one `--task` per process to give each task a fresh wasm instance: wasm
// linear memory never shrinks, so one task could otherwise affect the next.
// `wasmGrowthBytesPerCall` records wasm memory growth during the measured calls.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Bench } from 'tinybench';
import { loadEsm } from './load.mjs';

const args = process.argv.slice(2);
const libDir = args[0];
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const jsonOut = opt('--json', null);
const time = Number(opt('--time', 500));
const only = opt('--task', null);
if (!libDir) {
  console.error('usage: node test/compat/bench.mjs <lib-dir> [--json <out>] [--time <ms>] [--task <name>] [--list]');
  process.exit(2);
}

const lib = await loadEsm(libDir);
const { RRegex } = lib;
const text = readFileSync(resolve(import.meta.dirname, '../__data__/input-text.txt'), 'utf8');

const small = "'Citizen Kane' (1941), 'The Wizard of Oz' (1939), 'M' (1931). Mail foo@example.com";
const large = text.slice(0, Math.floor(text.length / 10)); // same slice as test/node.bench.mjs

const re = {
  email: new RRegex('[\\w\\.+-]+@[\\w\\.-]+\\.[\\w\\.-]+'),
  word: new RRegex('\\w+'),
  movie: new RRegex("'(?P<title>[^']+)'\\s+\\((?P<year>\\d{4})\\)"),
  pair: new RRegex('(?<first>\\w+)\\s+(\\w+)?'),
  hirSmall: new RRegex('a(b|c)*?d{2,5}$'),
  hirLarge: new RRegex("(?m)^(?P<user>[\\w.+-]+)@(?P<host>[\\w-]+(?:\\.[\\w-]+)+)\\b|\\p{Greek}{2,}|(?-u:\\d+)"),
};

const tasks = {
  'find / small': () => re.email.find(small),
  'find / large': () => re.email.find(large),
  'findAll / small': () => re.word.findAll(small),
  'findAll / large': () => re.word.findAll(large),
  'captures / small': () => re.movie.captures(small),
  'captures / large': () => re.pair.captures(large),
  'capturesAll / small': () => re.movie.capturesAll(small),
  'capturesAll / large': () => re.pair.capturesAll(large),
  'syntax / small': () => re.hirSmall.syntax(),
  'syntax / large': () => re.hirLarge.syntax(),
};

if (args.includes('--list')) {
  console.log(Object.keys(tasks).join('\n'));
  process.exit(0);
}
if (only && !(only in tasks)) {
  console.error(`unknown task: ${only}`);
  process.exit(2);
}

const counts = only ? {} : {
  'findAll / large': re.word.findAll(large).length,
  'capturesAll / large': re.pair.capturesAll(large).length,
};

if (args.includes('--meta')) {
  const meta = { node: process.version, haystacks: { smallBytes: Buffer.byteLength(small), largeBytes: Buffer.byteLength(large) }, counts };
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(meta, null, 2));
  console.log(JSON.stringify(meta));
  process.exit(0);
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
const wasmBytes = () => lib.__wasm.memory.buffer.byteLength;

const results = {};
for (const [name, fn] of Object.entries(tasks)) {
  if (only && name !== only) continue;
  // One Bench per task so a slow task cannot starve the others of samples.
  const bench = new Bench({ time, warmupTime: Math.min(250, time / 4) });
  bench.add(name, fn);
  await bench.warmup();
  const before = wasmBytes();
  await bench.run();
  const r = bench.tasks[0].result;
  if (r.error) throw r.error;
  const sorted = [...r.samples].sort((a, b) => a - b);
  results[name] = {
    hz: r.hz,
    medianMs: percentile(sorted, 50),
    p99Ms: percentile(sorted, 99),
    rme: r.rme,
    samples: r.samples.length,
    wasmGrowthBytesPerCall: (wasmBytes() - before) / r.samples.length,
  };
}

const out = {
  node: process.version,
  haystacks: { smallBytes: Buffer.byteLength(small), largeBytes: Buffer.byteLength(large) },
  counts,
  results,
};
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 2));
console.table(Object.fromEntries(Object.entries(results).map(([k, v]) => [k, {
  'ops/s': Math.round(v.hz), 'median (ms)': v.medianMs.toFixed(4), 'p99 (ms)': v.p99Ms.toFixed(4),
  'rme %': v.rme.toFixed(2), samples: v.samples,
}])));
