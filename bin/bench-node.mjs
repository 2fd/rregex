#!/usr/bin/env node
// Runs the base vs head benchmarks in Node and writes the samples to a JSON
// file, for `bench-compare.mjs --runtime <file>` (same format as
// bin/bench-browser.mjs).
//
// Usage:
//   node bin/bench-node.mjs --base <lib dir> --head <lib dir> \
//     [--json <file>] [--rounds 5] [--time 250]
//
// To reduce noise, base and head run next to each other for every case and
// the order alternates on each round (see bin/bench-cases.mjs).
//
// Every (round, case) pair runs in a new worker thread. This gives each case a
// clean wasm memory: older builds use the `wee_alloc` allocator, where calls
// with large inputs grow the wasm memory until it hits the 4 GiB limit and trap.

import { Bench } from 'tinybench';
import { parseArgs } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { DATA_PATH, addRound, cases, emptySamples, nativeCases, roundOrder, sample } from './bench-cases.mjs';

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
    json: { type: 'string' },
    rounds: { type: 'string', default: process.env.BENCH_ROUNDS ?? '5' },
    time: { type: 'string', default: process.env.BENCH_TIME ?? '250' },
  },
});

if (!args.base || !args.head) {
  console.error('Usage: bench-node.mjs --base <lib dir> --head <lib dir> [--json <file>] [options]');
  process.exit(2);
}

const rounds = Number(args.rounds);
const time = Number(args.time);
const runtime = `Node ${process.version}`;
const dirs = { base: resolve(args.base), head: resolve(args.head) };
const names = [...cases(await importLib(dirs.head), data).keys()];

/** Runs one case for both builds in a new worker thread. */
const runCase = (name, order) =>
  new Promise((done, fail) => {
    const worker = new Worker(fileURLToPath(import.meta.url), {
      workerData: { dirs, name, order, time },
    });
    worker.once('message', done);
    worker.once('error', fail);
    worker.once('exit', (code) => code && fail(new Error(`${name}: worker exited with code ${code}`)));
  });

console.error(`${runtime}: ${names.length} cases × ${rounds} rounds × ${time} ms`);

const samples = Object.fromEntries(names.map((name) => [name, emptySamples()]));
for (let round = 0; round < rounds; round++) {
  for (const name of names) {
    addRound(samples[name], await runCase(name, roundOrder(round)));
  }
  console.error(`${runtime}: round ${round + 1}/${rounds} done`);
}

const results = { runtime, cpu: cpus()[0]?.model, rounds, time, samples };
const json = JSON.stringify(results, null, 2) + '\n';
if (args.json) {
  await writeFile(args.json, json);
} else {
  process.stdout.write(json);
}
