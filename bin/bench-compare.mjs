#!/usr/bin/env node
// Writes the report of the benchmarks: compares two rregex builds (base vs
// head) in each runtime, and head vs the native RegExp, as Markdown and JSON.
//
// Usage:
//   node bin/bench-compare.mjs --base <lib dir> --head <lib dir> \
//     --runtime <json> [--runtime <json>]... \
//     [--base-label <text>] [--head-label <text>] [--build-time <json>] \
//     [--markdown <file>] [--json <file>] [--threshold 10]
//
// Each --runtime is the samples of one runtime, written by bin/bench-node.mjs
// or bin/bench-browser.mjs. The runtimes can run on different machines: every
// delta compares base and head on the same machine. --build-time adds the
// build time of head, written by bin/build.sh (BUILD_TIMINGS=<file>). The lib
// dirs only give the size of the wasm files.
//
// The reported delta is the median of the per-round head/base ratios.

import { parseArgs } from 'node:util';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { summarize } from './bench-cases.mjs';

const { values: args } = parseArgs({
  options: {
    base: { type: 'string' },
    head: { type: 'string' },
    'base-label': { type: 'string', default: 'base' },
    'head-label': { type: 'string', default: 'head' },
    runtime: { type: 'string', multiple: true, default: [] },
    'build-time': { type: 'string' },
    markdown: { type: 'string' },
    json: { type: 'string' },
    threshold: { type: 'string', default: process.env.BENCH_THRESHOLD ?? '10' },
  },
});

if (!args.base || !args.head || !args.runtime.length) {
  console.error('Usage: bench-compare.mjs --base <lib dir> --head <lib dir> --runtime <json>... [options]');
  process.exit(2);
}

const THRESHOLD = Number(args.threshold) / 100;

const dirs = { base: resolve(args.base), head: resolve(args.head) };
const size = {
  base: (await stat(resolve(dirs.base, 'rregex.wasm'))).size,
  head: (await stat(resolve(dirs.head, 'rregex.wasm'))).size,
};
size.delta = size.head / size.base - 1;

const build = args['build-time'] ? JSON.parse(await readFile(args['build-time'], 'utf8')) : null;

const runtimes = [];
for (const file of args.runtime) {
  const { samples, ...runtime } = JSON.parse(await readFile(file, 'utf8'));
  runtimes.push({ ...runtime, results: summarize(samples, THRESHOLD) });
}

// every case of every runtime, in the order of the first one that has it
const names = [...new Set(runtimes.flatMap(({ results }) => results.map((r) => r.name)))];

// "5 rounds × 250 ms", once if every runtime used the same settings
const settings = [...new Set(runtimes.map((r) => `${r.rounds} rounds × ${r.time} ms`))];

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
    `on ${list(runtimes.map((r) => r.runtime))} (${settings.join(' / ')} per case). ` +
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
for (const { runtime, cpu, results } of runtimes) {
  lines.push(`<details><summary>${runtime}: times${cpu ? ` <sub>(${cpu})</sub>` : ''}</summary>`, '');
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

// build time of head (base is the published package, it is not built)
if (build) {
  lines.push('| Build step | head |', '|:--|--:|');
  const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`;
  for (const { name, ms } of build.steps) lines.push(`| \`${name}\` | ${seconds(ms)} |`);
  lines.push(`| **Total** | **${seconds(build.total)}** |`, '');
}

lines.push(
  '<sub>Δ time is the median of the per-round head/base ratios (lower is better). ' +
    'RegExp is the time of the equivalent native `RegExp` call in the same runtime ' +
    '(`new` has no equivalent, `RegExp` compiles on first use). ' +
    '± is the worst relative margin of error seen across rounds. ' +
    (build
      ? 'The build time of `cargo build` depends on the state of the CI cache; ' +
        '`wasm-opt` and `tsdown` run in parallel, so the total is less than the sum. '
      : '') +
    'Shared CI runners are noisy: re-run the job before you act on a small regression.</sub>',
);

const markdown = lines.join('\n') + '\n';
const json = { threshold: THRESHOLD, size, build, runtimes };

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
