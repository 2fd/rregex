// Differential compatibility test: runs the same corpus against two builds
// (baseline vs. candidate) for every distributable target and requires the
// JS-observable output to be identical.
//
// usage: node test/compat/diff.mjs <baseline-lib-dir> <candidate-lib-dir> [--json <out>]
import { writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { loadTargets } from './load.mjs';
import {
  haystacks, invalidPatterns, largeHaystack, largePatterns, limits, patterns, replacements,
  setInputs, starts,
} from './corpus.mjs';

const [baseDir, headDir] = process.argv.slice(2);
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
if (!baseDir || !headDir) {
  console.error('usage: node test/compat/diff.mjs <baseline-lib-dir> <candidate-lib-dir> [--json <out>]');
  process.exit(2);
}

const TARGETS = ['esm', 'cjs', 'web', 'standalone'];

/** Runs `fn`, capturing either its return value or a description of what it threw. */
function capture(fn) {
  try {
    return { ok: fn() };
  } catch (e) {
    return { threw: describeThrown(e) };
  }
}

function describeThrown(e) {
  if (e === null || (typeof e !== 'object' && typeof e !== 'function')) {
    return { typeof: typeof e, value: String(e) };
  }
  return {
    typeof: typeof e,
    instanceofError: e instanceof Error,
    constructor: e.constructor?.name,
    protoIsErrorPrototype: Object.getPrototypeOf(e) === Error.prototype,
    name: e.name,
    message: e.message,
    ownKeys: Reflect.ownKeys(e).filter((k) => k !== 'stack').map(String),
  };
}

/**
 * Canonical structural signature: type tags, prototypes, own key order,
 * property descriptors and typed array layout. Two values with the same
 * signature are indistinguishable for any consumer that does not mutate them.
 */
function signature(v, seen = new Set()) {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  const t = typeof v;
  if (t === 'number') return Object.is(v, -0) ? 'number(-0)' : `number(${v})`;
  if (t === 'string') return `string(${JSON.stringify(v)})`;
  if (t === 'boolean' || t === 'bigint') return `${t}(${String(v)})`;
  if (t === 'symbol' || t === 'function') return `${t}(${String(v.description ?? v.name)})`;
  if (seen.has(v)) return 'cycle';
  seen.add(v);
  const proto = Object.getPrototypeOf(v);
  const protoName = proto === null ? 'null' : proto === Object.prototype ? 'Object' : proto?.constructor?.name;
  if (v instanceof Uint8Array) {
    return `Uint8Array{proto:${protoName},byteOffset:${v.byteOffset},bufferLength:${v.buffer.byteLength},`
      + `ownKeys:${JSON.stringify(Reflect.ownKeys(v).map(String))},bytes:[${Array.from(v).join(',')}]}`;
  }
  const keys = Reflect.ownKeys(v);
  const parts = keys.map((k) => {
    const d = Object.getOwnPropertyDescriptor(v, k);
    const flags = `${d.enumerable ? 'e' : '-'}${d.writable ? 'w' : '-'}${d.configurable ? 'c' : '-'}`;
    const value = 'value' in d ? signature(d.value, seen) : 'accessor';
    return `${String(k)}[${flags}]:${value}`;
  });
  seen.delete(v);
  return `${Array.isArray(v) ? 'Array' : 'Object'}<${protoName},ext:${Object.isExtensible(v)}>{${parts.join(',')}}`;
}

/** JSON with explicit tags for values JSON would otherwise lose or conflate. */
function taggedJson(v) {
  return JSON.stringify(v, function (key, value) {
    if (value === undefined) return '«undefined»';
    if (value instanceof Uint8Array) return { '«Uint8Array»': Array.from(value) };
    if (typeof value === 'bigint') return `«bigint:${value}»`;
    if (typeof value === 'number' && !Number.isFinite(value)) return `«number:${value}»`;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { '«keys»': Object.keys(value), ...value };
    }
    return value;
  });
}

/** One compiled `RRegex` per (target module, pattern); compiling dominates otherwise. */
const regexCache = new Map();
function compiled(lib, pattern) {
  let byPattern = regexCache.get(lib);
  if (!byPattern) regexCache.set(lib, (byPattern = new Map()));
  let re = byPattern.get(pattern);
  if (!re) byPattern.set(pattern, (re = new lib.RRegex(pattern)));
  return re;
}

/** Builds the list of cases. Each case runs against one loaded target `lib`. */
function buildCases() {
  const cases = [];
  const add = (label, run) => cases.push({ label, run });

  add('escape', (lib) => haystacks.concat(patterns).map((s) => lib.escape(s)));

  for (const p of invalidPatterns) {
    // Instances from two loaded builds have distinct class prototypes, so
    // normalize the (unexpected) success case instead of returning the instance.
    add(`new RRegex(${JSON.stringify(p)})`, (lib) => {
      const re = new lib.RRegex(p);
      return { class: re.constructor.name, toString: re.toString() };
    });
  }

  for (const p of patterns) {
    const P = JSON.stringify(p);
    add(`${P}.syntax()`, (lib) => new lib.RRegex(p).syntax());
    add(`${P}.meta`, (lib) => {
      const re = new lib.RRegex(p);
      return { captureNames: re.captureNames(), capturesLength: re.capturesLength(), toString: re.toString() };
    });

    for (const h of haystacks) {
      const H = JSON.stringify(h.length > 40 ? `${h.slice(0, 40)}…(${h.length})` : h);
      const len = Buffer.byteLength(h);
      add(`${P} find/findAll/captures ${H}`, (lib) => {
        const re = compiled(lib, p);
        return {
          isMatch: re.isMatch(h),
          find: re.find(h),
          findAll: re.findAll(h),
          captures: re.captures(h),
          capturesAll: re.capturesAll(h),
          shortestMatch: re.shortestMatch(h),
          split: re.split(h),
        };
      });
      add(`${P} *At ${H}`, (lib) => {
        const re = compiled(lib, p);
        return starts(len).map((s) => [s, capture(() => re.findAt(h, s)),
          capture(() => re.isMatchAt(h, s)), capture(() => re.shortestMatchAt(h, s))]);
      });
      add(`${P} replace/splitn ${H}`, (lib) => {
        const re = compiled(lib, p);
        return {
          replace: replacements.map((r) => [re.replace(h, r), re.replaceAll(h, r)]),
          replacen: limits.map((n) => re.replacen(h, n, '<$0>')),
          splitn: limits.map((n) => re.splitn(h, n)),
        };
      });
    }
  }

  for (const p of largePatterns) {
    const P = JSON.stringify(p);
    add(`${P} large findAll/capturesAll`, (lib) => {
      const re = compiled(lib, p);
      return { findAll: re.findAll(largeHaystack), capturesAll: re.capturesAll(largeHaystack) };
    });
  }

  for (const input of setInputs) {
    const I = input.map((x) => (typeof x === 'symbol' ? 'Symbol' : typeof x === 'bigint' ? `${x}n` : JSON.stringify(x))).join(',');
    add(`new RRegexSet([${I}])`, (lib) => {
      const set = new lib.RRegexSet(input);
      return haystacks.slice(0, 20).map((h) => [set.isMatch(h), set.matches(h)]);
    });
  }
  for (const input of ['ab', 5, {}, null, undefined, { length: 2, 0: 'a', 1: 'b' }]) {
    add(`new RRegexSet(${String(input)})`, (lib) => {
      const set = new lib.RRegexSet(input);
      return [set.isMatch('ab'), set.matches('ab')];
    });
  }

  return cases;
}

/** Collects every `@name:@variant` (and optional-field state) seen in a HIR. */
function collectCoverage(value, out) {
  if (!value || typeof value !== 'object' || value instanceof Uint8Array) return;
  if (Array.isArray(value)) { value.forEach((v) => collectCoverage(v, out)); return; }
  const name = value['@name']?.replace('regex_syntax::hir::', '');
  if (name) {
    out.add(value['@variant'] ? `${name}::${value['@variant']}` : name);
    if (name === 'Repetition') out.add(`Repetition.max=${value.max === undefined ? 'undefined' : 'number'}`);
    if (name === 'Capture') out.add(`Capture.name=${value.name === undefined ? 'undefined' : 'string'}`);
  }
  Object.values(value).forEach((v) => collectCoverage(v, out));
}

const EXPECTED_COVERAGE = [
  'Hir', 'Literal', 'ClassUnicode', 'ClassUnicodeRange', 'ClassBytes', 'ClassBytesRange',
  'Repetition.max=undefined', 'Repetition.max=number', 'Capture.name=undefined', 'Capture.name=string',
  ...['Empty', 'Literal', 'Class', 'Look', 'Repetition', 'Capture', 'Concat', 'Alternation'].map((v) => `HirKind::${v}`),
  'Class::Unicode', 'Class::Bytes',
  ...['Start', 'End', 'StartLF', 'EndLF', 'StartCRLF', 'EndCRLF', 'WordAscii', 'WordAsciiNegate',
    'WordUnicode', 'WordUnicodeNegate', 'WordStartAscii', 'WordEndAscii', 'WordStartUnicode',
    'WordEndUnicode', 'WordStartHalfAscii', 'WordEndHalfAscii', 'WordStartHalfUnicode',
    'WordEndHalfUnicode'].map((v) => `Look::${v}`),
];

/** Negative control: every pair below differs and must be flagged by the comparators. */
function selfCheck() {
  const differs = (a, b) => !isDeepStrictEqual(a, b) || signature(a) !== signature(b) || taggedJson(a) !== taggedJson(b);
  const pairs = [
    [{ start: 0, end: 1 }, { end: 1, start: 0 }], // key order only
    [{ max: undefined }, {}], // present-but-undefined vs. missing
    [{ max: undefined }, { max: null }],
    [[new Uint8Array([97])], [[97]]],
    [new Uint8Array([97]), new Uint8Array([97]).subarray(0)], // same bytes, same view: must NOT differ
    [{ n: 1 }, { n: '1' }],
    [Object.create(null), {}],
    [describeThrown(new Error('x')), describeThrown(new TypeError('x'))],
    [describeThrown(new Error('x')), describeThrown(new Error('y'))],
  ];
  const failures = pairs.filter(([a, b], i) => (i === 4 ? differs(a, b) : !differs(a, b)));
  if (failures.length) {
    console.error('compat: comparator self-check failed', failures);
    process.exit(3);
  }
}
selfCheck();

const base = await loadTargets(baseDir);
const head = await loadTargets(headDir);
const cases = buildCases();

const summary = { cases: cases.length, targets: {}, mismatches: [], coverage: {}, errorsCompared: 0 };
const coverage = new Set();
const t0 = performance.now();

for (const target of TARGETS) {
  let checks = 0;
  for (const { label, run } of cases) {
    const a = capture(() => run(base[target]));
    const b = capture(() => run(head[target]));
    if (a.threw) summary.errorsCompared++;
    if (target === 'esm' && a.ok && label.endsWith('.syntax()')) collectCoverage(a.ok, coverage);

    const failed = [];
    if (!isDeepStrictEqual(a, b)) failed.push('isDeepStrictEqual');
    if (signature(a) !== signature(b)) failed.push('signature (types/prototypes/key order/descriptors)');
    if (taggedJson(a) !== taggedJson(b)) failed.push('tagged JSON (undefined/Uint8Array/key order)');
    checks += 3;
    if (failed.length) {
      summary.mismatches.push({ target, label, failed, baseline: taggedJson(a).slice(0, 400), candidate: taggedJson(b).slice(0, 400) });
    }
  }
  summary.targets[target] = { cases: cases.length, checks };
}

summary.coverage.seen = [...coverage].sort();
summary.coverage.missing = EXPECTED_COVERAGE.filter((c) => !coverage.has(c));
summary.durationMs = Math.round(performance.now() - t0);

console.log(`compat: ${cases.length} cases x ${TARGETS.length} targets, ${summary.errorsCompared} error cases, `
  + `${summary.mismatches.length} mismatches, ${summary.durationMs} ms`);
console.log(`compat: HIR coverage ${EXPECTED_COVERAGE.length - summary.coverage.missing.length}/${EXPECTED_COVERAGE.length}`
  + (summary.coverage.missing.length ? ` (missing: ${summary.coverage.missing.join(', ')})` : ''));
for (const m of summary.mismatches.slice(0, 20)) {
  console.log(`MISMATCH [${m.target}] ${m.label}: ${m.failed.join('; ')}\n  baseline:  ${m.baseline}\n  candidate: ${m.candidate}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(summary, null, 2));
process.exit(summary.mismatches.length || summary.coverage.missing.length ? 1 : 0);
