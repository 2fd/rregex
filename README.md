# rregex

A dependency-free WebAssembly build of [Rust Regex](https://docs.rs/regex/latest/regex/) for Javascript

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/2fd/rregex/release.yml?branch=master) ![GitHub Release](https://img.shields.io/github/v/release/2fd/rregex) ![NPM Version](https://img.shields.io/npm/v/rregex)
[![JSR](https://jsr.io/badges/@rregex/rregex)](https://jsr.io/@rregex/rregex)

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

| Runtime            | Import                                                  | version    |
| ------------------ | ------------------------------------------------------- | ---------- |
| Node.js (esm)      | `import { RRegex, RRegexSet } from 'rregex'`            | `*`        |
| Node.js (commonjs) | `const { RRegex, RRegexSet } = require('rregex')`       | `*`        |
| Deno               | `import { RRegex, RRegexSet } from '@rregex/rregex'`    | `>=1.10.8` |
| Bun                | `import { RRegex, RRegexSet } from '@rregex/rregex'`    | `>=1.10.8` |
| Cloudflare Workers | `import { RRegex, RRegexSet } from 'rregex/lib/cf.mjs'` | `>=1.10.8` |
| Browser            | TODO                                                    |            |
| Standalone         | TODO                                                    |            |

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
