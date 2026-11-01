#!/usr/bin/env node
// Runs the base vs head benchmarks of bin/bench-cases.mjs in a browser and
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
import { cpus, tmpdir } from 'node:os';
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

const started = performance.now();
const elapsed = () => `${((performance.now() - started) / 1000).toFixed(1)} s`;
let ready = false;

const results = Promise.withResolvers();
const server = createStaticServer({
  onPost(pathname, message) {
    if (pathname !== '/results') return;
    // the page posts its first message once the browser runs it
    if (!ready) {
      ready = true;
      console.error(`${args.browser}: page ready after ${elapsed()}`);
    }
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
  const json = JSON.stringify({ ...(await results.promise), cpu: cpus()[0]?.model }, null, 2) + '\n';
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
  // SIGKILL: the results are in (or the run failed), so nothing in the
  // browser needs a clean shutdown, and Firefox can take seconds on SIGTERM
  if (browser && browser.exitCode === null && browser.signalCode === null) {
    const closing = performance.now();
    browser.removeAllListeners('exit');
    let timeout;
    const exited = new Promise((done) => {
      browser.once('exit', done);
      // unref: a pending timer would keep the process alive after the exit
      timeout = setTimeout(done, 5000).unref();
    });
    try {
      process.kill(-browser.pid, 'SIGKILL');
    } catch {
      browser.kill('SIGKILL');
    }
    await exited;
    clearTimeout(timeout);
    console.error(`${args.browser}: closed in ${((performance.now() - closing) / 1000).toFixed(1)} s`);
  }
  server.closeAllConnections();
  server.close();
  if (profile) await rm(profile, { recursive: true, force: true });
}
