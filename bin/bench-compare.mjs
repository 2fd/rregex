#!/usr/bin/env node
// Compares the performance of two rregex builds (base vs head) in the same
// process and writes a Markdown report and a JSON file with the results.
//
// Usage:
//   node bin/bench-compare.mjs --base <lib dir> --head <lib dir> \
//     [--base-label <text>] [--head-label <text>] \
//     [--markdown <file>] [--json <file>] \
//     [--rounds 5] [--time 250] [--threshold 10]
//
// To reduce noise, base and head run next to each other for every case, the
// order alternates on each round, and the reported delta is the median of the
// per-round head/base ratios.
//
// Every (round, case) pair runs in a new worker thread. This gives each case a
// clean wasm memory: with the `wee_alloc` allocator, calls with large inputs
// grow the wasm memory until it hits the 4 GiB limit and traps.

import { Bench } from 'tinybench';
import { parseArgs } from 'node:util';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let data = await readFile(resolve(root, 'test/__data__/input-text.txt'), 'utf8');
data = data.slice(0, data.length / 10);

const PATTERNS = {
  email: '[\\w\\.+-]+@[\\w\\.-]+\\.[\\w\\.-]+',
  ip: '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])',
  uri: '[\\w]+://[^/\\s?#]+[^\\s?#]+(?:\\?[^\\s#]*)?(?:#[^\\s]*)?',
};

/** Builds the cases for one build of the library, keyed by name. */
function cases(lib) {
  const list = new Map();
  for (const [name, pattern] of Object.entries(PATTERNS)) {
    const re = new lib.RRegex(pattern);
    list.set(`${name}: new`, () => new lib.RRegex(pattern).free());
    list.set(`${name}: isMatch`, () => re.isMatch(data));
    list.set(`${name}: find`, () => re.find(data));
    list.set(`${name}: findAll`, () => re.findAll(data));
    list.set(`${name}: replaceAll`, () => re.replaceAll(data, '-'));
  }
  const patterns = Object.values(PATTERNS);
  const set = new lib.RRegexSet(patterns);
  list.set('set: new', () => new lib.RRegexSet(patterns).free());
  list.set('set: matches', () => set.matches(data));
  return list;
}

const importLib = (dir) => import(pathToFileURL(resolve(dir, 'esm.mjs')).href);

if (!isMainThread) {
  // Worker: run one case for both builds, in the given order.
  const { dirs, name, order, time } = workerData;
  const bench = new Bench({ time, warmupTime: Math.min(100, time) });
  for (const build of order) {
    bench.add(build, cases(await importLib(dirs[build])).get(name));
  }
  await bench.warmup();
  await bench.run();
  const result = {};
  for (const task of bench.tasks) {
    if (task.result?.error) throw task.result.error;
    result[task.name] = { mean: task.result.mean, rme: task.result.rme };
  }
  parentPort.postMessage(result);
  process.exit(0);
}

const { values: args } = parseArgs({
  options: {
    base: { type: 'string' },
    head: { type: 'string' },
    'base-label': { type: 'string', default: 'base' },
    'head-label': { type: 'string', default: 'head' },
    markdown: { type: 'string' },
    json: { type: 'string' },
    rounds: { type: 'string', default: process.env.BENCH_ROUNDS ?? '5' },
    time: { type: 'string', default: process.env.BENCH_TIME ?? '250' },
    threshold: { type: 'string', default: process.env.BENCH_THRESHOLD ?? '10' },
  },
});

if (!args.base || !args.head) {
  console.error('Usage: bench-compare.mjs --base <lib dir> --head <lib dir> [options]');
  process.exit(2);
}

const ROUNDS = Number(args.rounds);
const TIME = Number(args.time);
const THRESHOLD = Number(args.threshold) / 100;

const dirs = { base: resolve(args.base), head: resolve(args.head) };
const size = {
  base: (await stat(resolve(dirs.base, 'rregex.wasm'))).size,
  head: (await stat(resolve(dirs.head, 'rregex.wasm'))).size,
};
size.delta = size.head / size.base - 1;

const names = [...cases(await importLib(dirs.head)).keys()];

/** Runs one case for both builds in a new worker thread. */
const runCase = (name, order) =>
  new Promise((done, fail) => {
    const worker = new Worker(fileURLToPath(import.meta.url), {
      workerData: { dirs, name, order, time: TIME },
    });
    worker.once('message', done);
    worker.once('error', fail);
    worker.once('exit', (code) => code && fail(new Error(`${name}: worker exited with code ${code}`)));
  });

/** @type {Map<string, { base: number[], head: number[], ratio: number[], rme: number[] }>} */
const samples = new Map(names.map((name) => [name, { base: [], head: [], ratio: [], rme: [] }]));

for (let round = 0; round < ROUNDS; round++) {
  const order = round % 2 === 0 ? ['base', 'head'] : ['head', 'base'];
  for (const name of names) {
    const result = await runCase(name, order);
    const s = samples.get(name);
    for (const build of order) {
      s[build].push(result[build].mean);
      s.rme.push(result[build].rme);
    }
    s.ratio.push(result.head.mean / result.base.mean);
  }
  console.error(`round ${round + 1}/${ROUNDS} done`);
}

const median = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const results = names.map((name) => {
  const s = samples.get(name);
  const delta = median(s.ratio) - 1;
  const status = delta > THRESHOLD ? 'regression' : delta < -THRESHOLD ? 'improvement' : 'unchanged';
  return {
    name,
    base: median(s.base),
    head: median(s.head),
    delta,
    rme: Math.max(...s.rme),
    status,
  };
});

const regressions = results.filter((r) => r.status === 'regression');
const improvements = results.filter((r) => r.status === 'improvement');

// ----- report -----

const fmtTime = (ms) => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  if (ms >= 1) return `${ms.toFixed(2)} ms`;
  if (ms >= 0.001) return `${(ms * 1000).toFixed(2)} µs`;
  return `${(ms * 1e6).toFixed(0)} ns`;
};
const fmtOps = (ms) => Math.round(1000 / ms).toLocaleString('en-US');
const fmtDelta = (d) => `${d > 0 ? '+' : ''}${(d * 100).toFixed(1)}%`;
const fmtBytes = (b) => `${(b / 1024).toFixed(1)} KiB`;
const icon = { regression: '🔴', improvement: '🟢', unchanged: '⚪' };

const lines = [];
lines.push('## ⏱️ Benchmark results', '');
lines.push(
  `Comparing **head** ${args['head-label']} against **base** ${args['base-label']} ` +
  `on Node ${process.version} (${ROUNDS} rounds × ${TIME} ms per case). ` +
  `Changes within ±${args.threshold}% are treated as noise.`,
  '',
);

if (regressions.length) {
  lines.push(`> [!WARNING]`, `> **${regressions.length} possible performance regression(s)** detected.`, '');
} else {
  lines.push(`> [!NOTE]`, `> No performance regressions detected` +
    (improvements.length ? ` (${improvements.length} improvement(s)).` : '.'), '');
}

lines.push('| | Benchmark | base | head | Δ time | ± |');
lines.push('|:-:|:--|--:|--:|--:|--:|');
for (const r of results) {
  lines.push(
    `| ${icon[r.status]} | \`${r.name}\` ` +
    `| ${fmtTime(r.base)} <sub>(${fmtOps(r.base)} ops/s)</sub> ` +
    `| ${fmtTime(r.head)} <sub>(${fmtOps(r.head)} ops/s)</sub> ` +
    `| **${fmtDelta(r.delta)}** | ${r.rme.toFixed(1)}% |`,
  );
}
lines.push('');
lines.push('| Artifact | base | head | Δ size |');
lines.push('|:--|--:|--:|--:|');
lines.push(`| \`rregex.wasm\` | ${fmtBytes(size.base)} | ${fmtBytes(size.head)} | ${fmtDelta(size.delta)} |`);
lines.push('');
lines.push(
  '<sub>Δ time is the median of the per-round head/base ratios (lower is better). ' +
  '± is the worst relative margin of error seen across rounds. ' +
  'Shared CI runners are noisy: re-run the job before you act on a small regression.</sub>',
);

const markdown = lines.join('\n') + '\n';
const json = { rounds: ROUNDS, time: TIME, threshold: THRESHOLD, node: process.version, size, results };

if (args.markdown) await writeFile(args.markdown, markdown);
if (args.json) await writeFile(args.json, JSON.stringify(json, null, 2) + '\n');
if (!args.markdown) process.stdout.write(markdown);

if (process.env.GITHUB_ACTIONS) {
  for (const r of regressions) {
    console.log(`::warning title=Benchmark regression::${r.name} is ${fmtDelta(r.delta)} slower than base`);
  }
}
