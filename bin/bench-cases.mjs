// Benchmark cases shared by bin/bench-node.mjs (Node) and
// test/browser/compare.worker.mjs (browsers), so every runtime runs the
// same calls on the same input.

/** Input text, relative to the repository root. */
export const DATA_PATH = 'test/__data__/input-text.txt';

/** The part of the input text used by the benchmarks. */
export const sample = (text) => text.slice(0, text.length / 10);

export const PATTERNS = {
  email: '[\\w\\.+-]+@[\\w\\.-]+\\.[\\w\\.-]+',
  ip: '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])',
  uri: '[\\w]+://[^/\\s?#]+[^\\s?#]+(?:\\?[^\\s#]*)?(?:#[^\\s]*)?',
};

/** Builds the cases for one build of the library, keyed by name. */
export function cases(lib, data) {
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

/**
 * The native `RegExp` equivalent of each case, keyed by the same names.
 * `new` has no equivalent: `RegExp` compiles the pattern on first use.
 */
export function nativeCases(data) {
  const list = new Map();
  for (const [name, pattern] of Object.entries(PATTERNS)) {
    const re = new RegExp(pattern);
    const global = new RegExp(pattern, 'g');
    list.set(`${name}: isMatch`, () => re.test(data));
    list.set(`${name}: find`, () => re.exec(data));
    list.set(`${name}: findAll`, () => Array.from(data.matchAll(global)));
    list.set(`${name}: replaceAll`, () => data.replaceAll(global, '-'));
  }
  const regexes = Object.values(PATTERNS).map((pattern) => new RegExp(pattern));
  list.set('set: matches', () => regexes.flatMap((re, i) => (re.test(data) ? [i] : [])));
  return list;
}

const median = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * The order of the builds in each round: base and head alternate, so neither
 * always runs first, and the native call runs at the other end.
 */
export const roundOrder = (round) =>
  round % 2 === 0 ? ['base', 'head', 'native'] : ['native', 'head', 'base'];

/** Empty samples of one case, filled by `addRound`. */
export const emptySamples = () => ({ base: [], head: [], native: [], ratio: [], vsNative: [], rme: [] });

/** Adds the result of one round, `{ [build]: { mean, rme } }`, to the samples of a case. */
export function addRound(samples, result) {
  for (const [build, { mean, rme }] of Object.entries(result)) {
    samples[build].push(mean);
    if (build !== 'native') samples.rme.push(rme);
  }
  samples.ratio.push(result.head.mean / result.base.mean);
  if (result.native) samples.vsNative.push(result.head.mean / result.native.mean);
}

/**
 * Summarizes the samples of every case. `delta` is the median of the
 * per-round head/base ratios minus 1, `vsNative` the median of the per-round
 * head/native ratios.
 */
export function summarize(samples, threshold) {
  return Object.entries(samples).map(([name, s]) => {
    const delta = median(s.ratio) - 1;
    return {
      name,
      base: median(s.base),
      head: median(s.head),
      native: s.native.length ? median(s.native) : null,
      delta,
      vsNative: s.vsNative.length ? median(s.vsNative) : null,
      rme: Math.max(...s.rme),
      status: delta > threshold ? 'regression' : delta < -threshold ? 'improvement' : 'unchanged',
    };
  });
}
