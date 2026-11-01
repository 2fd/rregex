#!/usr/bin/env node
// Compares the performance of two rregex builds (base vs head), and of head
// vs the native RegExp, and writes a Markdown report and a JSON file with the
// results.
//
// Usage:
//   node bin/bench-compare.mjs --base <lib dir> --head <lib dir> \
//     [--base-label <text>] [--head-label <text>] \
//     [--runtime <json>]... \
//     [--markdown <file>] [--json <file>] \
//     [--rounds 5] [--time 250] [--threshold 10]
//
// The cases run in Node. Each --runtime adds the results of another runtime,
// written by bin/bench-browser.mjs, to the report.
//
// To reduce noise, base and head run next to each other for every case, the
// order alternates on each round, and the reported delta is the median of the
// per-round head/base ratios.
//
// Every (round, case) pair runs in a new worker thread. This gives each case a
// clean wasm memory: older builds use the `wee_alloc` allocator, where calls
// with large inputs grow the wasm memory until it hits the 4 GiB limit and trap.

import { Bench } from 'tinybench';
import { parseArgs } from 'node:util';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import {
  DATA_PATH,
  addRound,
  cases,
  emptySamples,
  nativeCases,
  roundOrder,
  sample,
  summarize,
} from './bench-cases.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = sample(await readFile(resolve(root, DATA_PATH), 'utf8'));

const importLib = (dir) => import(pathToFileURL(resolve(dir, 'esm.mjs')).href);

if (!isMainThread) {
  // Worker: run one case for both builds and the native RegExp, in the given order.
  const { dirs, name, order, time } = workerData;
  const bench = new Bench({ time, warmupTime: Math.min(100, time) });
  for (const build of order) {
    const fn =
      build === 'native'
        ? nativeCases(data).get(name)
        : cases(await importLib(dirs[build]), data).get(name);
    if (fn) bench.add(build, fn);
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
    runtime: { type: 'string', multiple: true, default: [] },
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

const names = [...cases(await importLib(dirs.head), data).keys()];

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

const samples = Object.fromEntries(names.map((name) => [name, emptySamples()]));

for (let round = 0; round < ROUNDS; round++) {
  for (const name of names) {
    addRound(samples[name], await runCase(name, roundOrder(round)));
  }
  console.error(`round ${round + 1}/${ROUNDS} done`);
}

const runtimes = [
  { runtime: `Node ${process.version}`, rounds: ROUNDS, time: TIME, results: summarize(samples, THRESHOLD) },
];
for (const file of args.runtime) {
  const other = JSON.parse(await readFile(file, 'utf8'));
  runtimes.push({ ...other, samples: undefined, results: summarize(other.samples, THRESHOLD) });
}

const regressions = runtimes.flatMap(({ runtime, results }) =>
  results.filter((r) => r.status === 'regression').map((r) => ({ runtime, ...r })),
);
const improvements = runtimes.flatMap(({ results }) => results.filter((r) => r.status === 'improvement'));

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
const icon = { regression: '⚠️', improvement: '✅', unchanged: '➖' };
const list = (items) =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items.join('');

const lines = [];
lines.push('## ⏱️ Benchmark results', '');
lines.push(
  `Comparing **head** ${args['head-label']} against **base** ${args['base-label']} ` +
    `on ${list(runtimes.map((r) => r.runtime))} (${ROUNDS} rounds × ${TIME} ms per case). ` +
    `Changes within ±${args.threshold}% are treated as noise.`,
  '',
);

if (regressions.length) {
  lines.push(`> [!WARNING]`, `> **${regressions.length} possible performance regression(s)** detected:`);
  for (const r of regressions) {
    lines.push(`> - \`${r.name}\` on ${r.runtime}: **${fmtDelta(r.delta)}**`);
  }
  lines.push('');
} else {
  lines.push(
    `> [!NOTE]`,
    `> No performance regressions detected` +
      (improvements.length ? ` (${improvements.length} improvement(s)).` : '.'),
    '',
  );
}

// summary: one Δ column per runtime
lines.push(
  `| Benchmark | ${runtimes.map((r) => `${r.runtime}<br>Δ time`).join(' | ')} |`,
  `|:--|${runtimes.map(() => '--:|').join('')}`,
);
for (const name of names) {
  const cells = runtimes.map(({ results }) => {
    const r = results.find((result) => result.name === name);
    if (!r) return '—';
    return `${icon[r.status]} **${fmtDelta(r.delta)}**`;
  });
  lines.push(`| \`${name}\` | ${cells.join(' | ')} |`);
}
lines.push('');

// details: the times of each runtime
for (const { runtime, results } of runtimes) {
  lines.push(`<details><summary>${runtime}: times</summary>`, '');
  lines.push('| | Benchmark | base | head | RegExp | Δ time | ± |');
  lines.push('|:-:|:--|--:|--:|--:|--:|--:|');
  for (const r of results) {
    lines.push(
      `| ${icon[r.status]} | \`${r.name}\` ` +
        `| ${fmtTime(r.base)} <sub>(${fmtOps(r.base)} ops/s)</sub> ` +
        `| ${fmtTime(r.head)} <sub>(${fmtOps(r.head)} ops/s)</sub> ` +
        `| ${r.native === null ? '—' : `${fmtTime(r.native)} <sub>(${fmtOps(r.native)} ops/s)</sub>`} ` +
        `| **${fmtDelta(r.delta)}** | ${r.rme.toFixed(1)}% |`,
    );
  }
  lines.push('', '</details>', '');
}

lines.push('| Artifact | base | head | Δ size |');
lines.push('|:--|--:|--:|--:|');
lines.push(`| \`rregex.wasm\` | ${fmtBytes(size.base)} | ${fmtBytes(size.head)} | ${fmtDelta(size.delta)} |`);
lines.push('');
lines.push(
  '<sub>Δ time is the median of the per-round head/base ratios (lower is better). ' +
    'RegExp is the time of the equivalent native `RegExp` call in the same runtime ' +
    '(`new` has no equivalent, `RegExp` compiles on first use). ' +
    '± is the worst relative margin of error seen across rounds. ' +
    'Shared CI runners are noisy: re-run the job before you act on a small regression.</sub>',
);

const markdown = lines.join('\n') + '\n';
const json = { rounds: ROUNDS, time: TIME, threshold: THRESHOLD, size, runtimes };

if (args.markdown) await writeFile(args.markdown, markdown);
if (args.json) await writeFile(args.json, JSON.stringify(json, null, 2) + '\n');
if (!args.markdown) process.stdout.write(markdown);

if (process.env.GITHUB_ACTIONS) {
  for (const r of regressions) {
    console.log(
      `::warning title=Benchmark regression::${r.name} is ${fmtDelta(r.delta)} slower than base on ${r.runtime}`,
    );
  }
}
