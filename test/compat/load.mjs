// Loads every distributable build target of a `lib/` directory so two builds
// (e.g. master vs. a branch) can be compared side by side in one process.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

/**
 * @param {string} libDir absolute or cwd-relative path to a built `lib/` directory
 * @returns {Promise<Record<'esm'|'cjs'|'web'|'standalone', any>>}
 */
export async function loadTargets(libDir) {
  const dir = resolve(libDir);
  const wasm = readFileSync(resolve(dir, 'rregex.wasm'));

  const esm = await import(pathToFileURL(resolve(dir, 'esm.mjs')).href);

  const cjs = createRequire(import.meta.url)(resolve(dir, 'commonjs.cjs'));

  const web = await import(pathToFileURL(resolve(dir, 'web.js')).href);
  web.initSync({ module: wasm });

  // `standalone.js` defines a global: `rregex` since 2.0, `wasm_bindgen` before
  // (`--target no-modules`). Scope it so two builds can be loaded in the same
  // realm (same `Object.prototype`).
  const code = readFileSync(resolve(dir, 'standalone.js'), 'utf8');
  const standalone = vm.runInThisContext(`(function () {\n${code}\nreturn typeof rregex !== "undefined" ? rregex : wasm_bindgen;\n})()`, {
    filename: resolve(dir, 'standalone.js'),
  });
  standalone.initSync({ module: wasm });

  return { esm, cjs, web, standalone };
}

/** Loads only the ESM target (used by the benchmarks). */
export async function loadEsm(libDir) {
  return import(pathToFileURL(resolve(libDir, 'esm.mjs')).href);
}
