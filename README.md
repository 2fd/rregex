# rregex

A WebAssembly build of [Rust Regex](https://docs.rs/regex/latest/regex/) for Javascript

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/2fd/rregex/release.yml?branch=master) ![GitHub Release](https://img.shields.io/github/v/release/2fd/rregex) ![NPM Version](https://img.shields.io/npm/v/rregex)
![JSR Version](https://img.shields.io/jsr/v/%40rregex/rregex)

> Note: this project is not intended to be used in production jet

- [Why Rust Regex](#why-rust-regex)
- [Install](#install)
- [Supported Runtimes](#supported-runtimes)
- [API](https://tsdocs.dev/docs/rregex/latest)
  - [`RRegex`](https://tsdocs.dev/docs/rregex/latest/classes/RRegex.html)
  - [`RRegexSet`](https://tsdocs.dev/docs/rregex/latest/classes/RRegexSet.html)
  - [`Match`](https://tsdocs.dev/docs/rregex/latest/types/Match.html)
  - [`Captures`](https://tsdocs.dev/docs/rregex/latest/types/Captures.html)
  - [`escape`](https://tsdocs.dev/docs/rregex/latest/functions/escape.html)
- [Known Issues](#known-issues)

## Why Rust Regex

Rust has a powerful Regex library with a lot of features that don't exists en the standard `Regex` object

[See the official documentation](https://docs.rs/regex/latest/regex/#syntax) for more detail

## Install

```bash
  # NPM
  npm install rregex

  # Yarn
  yarn add rregex

  # PNPM
  pnpm add rregex

  # Deno
  deno add @rregex/rregex

  # JSR
  npx jsr add @rregex/rregex
```

## Supported Runtimes

This package includes builds for multiple runtimes

| Runtime            | File                                            |
| ------------------ | ----------------------------------------------- |
| Node.js (esm)      | [`lib/esm.mjs` (default)](./test/node.test.mjs) |
| Node.js (commonjs) | [`lib/commonjs.cjs`](./test/node.test.cjs)      |
| Deno               | [`lib/esm.mjs`](./test/deno.test.mjs)           |
| Bun                | [`lib/esm.mjs`](./test/bun.test.mjs)            |
| Cloudflare Workers | TODO                                            |
| Browser            | TODO                                            |
| Standalone         | TODO                                            |
| Typescript         | `lib/types.d.ts`                                |

## Known Issues

If you call `splitn(text, limit)` and the expected result length is equal to `limit - 1` the result will include an extra item `""`, this behavior does not happen if `limit` es greater. **`fixed at >=1.3`**

```ts
const regex = new RRegex(",");
expect(regex.splitn("a,b,c", 0)).toEqual([]);
expect(regex.splitn("a,b,c", 1)).toEqual(["a,b,c"]);
expect(regex.splitn("a,b,c", 2)).toEqual(["a", "b,c"]);
expect(regex.splitn("a,b,c", 3)).toEqual(["a", "b", "c"]);

// This result includes an unexpected extra item
expect(regex.splitn("a,b,c", 4)).toEqual(["a", "b", "c", ""]);
expect(regex.splitn("a,b,c", 5)).toEqual(["a", "b", "c"]);

expect(regex.splitn("abc", 0)).toEqual([]);
expect(regex.splitn("abc", 1)).toEqual(["abc"]);

// This result includes an unexpected extra item
expect(regex.splitn("abc", 2)).toEqual(["abc", ""]);
expect(regex.splitn("abc", 3)).toEqual(["abc"]);
```
