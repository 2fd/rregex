#!/usr/bin/env node
// Runs the base vs head benchmarks of bin/bench-compare.mjs in a browser and
// writes the samples to a JSON file, for `bench-compare.mjs --runtime <file>`.
//
// Usage:
//   node bin/bench-browser.mjs --base <lib dir> --head <lib dir> \
//     --browser chrome|firefox|none [--json <file>] \
//     [--rounds 5] [--time 250] [--timeout 900]
//
// It serves the repository (both lib dirs must be inside it), opens
// test/browser/compare.html in a headless browser and waits for the page to
// post its results. With `--browser none` it prints the URL instead, to run
// the benchmarks in any browser (e.g. Safari).
//
// CHROME_BIN and FIREFOX_BIN override the browser executables.

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT, createStaticServer } from '../test/browser/server.mjs';

const BROWSERS = {
  chrome: {
    bin: process.env.CHROME_BIN ?? 'google-chrome',
    args: (profile, url) => [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      `--user-data-dir=${profile}`,
      url,
    ],
  },
  firefox: {
    bin: process.env.FIREFOX_BIN ?? 'firefox',
    args: (profile, url) => ['--headless', '--no-remote', '--profile', profile, url],
  },
};

const { values: args } = parseArgs({
  options: {
    base: { type: 'string' },
    head: { type: 'string' },
    browser: { type: 'string' },
    json: { type: 'string' },
    rounds: { type: 'string', default: process.env.BENCH_ROUNDS ?? '5' },
    time: { type: 'string', default: process.env.BENCH_TIME ?? '250' },
    timeout: { type: 'string', default: '900' },
  },
});

if (!args.base || !args.head || !(args.browser in BROWSERS || args.browser === 'none')) {
  console.error(
    'Usage: bench-browser.mjs --base <lib dir> --head <lib dir> --browser chrome|firefox|none [options]',
  );
  process.exit(2);
}

/** URL path of a directory inside the repository. */
function urlPath(dir) {
  const path = relative(ROOT, resolve(dir));
  if (path.startsWith('..')) {
    throw new Error(`${dir} is outside of the repository, the server cannot serve it`);
  }
  return `/${path.split(sep).join('/')}`;
}

const results = Promise.withResolvers();
const server = createStaticServer({
  onPost(pathname, message) {
    if (pathname !== '/results') return;
    if (message.type === 'progress') console.error(message.message);
    if (message.type === 'done') results.resolve(message.results);
    if (message.type === 'error') results.reject(new Error(message.message));
  },
});
await new Promise((listening) => server.listen(0, '127.0.0.1', listening));

const query = new URLSearchParams({
  base: urlPath(args.base),
  head: urlPath(args.head),
  rounds: args.rounds,
  time: args.time,
  report: '/results',
});
const url = `http://127.0.0.1:${server.address().port}/test/browser/compare.html?${query}`;

let browser;
let profile;
if (args.browser === 'none') {
  console.error(`open ${url}`);
} else {
  const { bin, args: browserArgs } = BROWSERS[args.browser];
  profile = await mkdtemp(join(process.env.RUNNER_TEMP ?? tmpdir(), `rregex-${args.browser}-`));
  // own process group, to stop the browser and its child processes together
  browser = spawn(bin, browserArgs(profile, url), { detached: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  browser.stderr.on('data', (chunk) => (stderr = (stderr + chunk).slice(-4000)));
  browser.once('error', (error) => results.reject(error));
  browser.once('exit', (code, signal) =>
    results.reject(new Error(`${bin} exited (${code ?? signal}) before the results:\n${stderr}`)),
  );
}

const timer = setTimeout(
  () => results.reject(new Error(`no results after ${args.timeout} s`)),
  Number(args.timeout) * 1000,
);

try {
  const json = JSON.stringify(await results.promise, null, 2) + '\n';
  if (args.json) {
    await writeFile(args.json, json);
  } else {
    process.stdout.write(json);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
  if (browser && browser.exitCode === null && browser.signalCode === null) {
    browser.removeAllListeners('exit');
    const exited = new Promise((done) => {
      browser.once('exit', done);
      setTimeout(done, 5000);
    });
    try {
      process.kill(-browser.pid, 'SIGTERM');
    } catch {
      browser.kill('SIGTERM');
    }
    await exited;
  }
  server.closeAllConnections();
  server.close();
  if (profile) await rm(profile, { recursive: true, force: true });
}
