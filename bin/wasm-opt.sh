#!/bin/bash
# Usage: bin/wasm-opt.sh <input.wasm> <output.wasm>
#
# Optimizes the wasm with binaryen. It prefers a native `wasm-opt` with the
# same version as the `binaryen` npm package: same output, but multi-threaded
# and ~10x faster than the npm package, which is an emscripten (JS) build.
# It looks for it in PATH and in target/binaryen (`pnpm setup` installs it
# there). Without one, it uses the npm package.
#
# The last output is kept in target/wasm-opt and reused while the input does
# not change.
#
# WASM_OPT_NPM=1 always runs the npm package, without the cache.
set -euo pipefail

SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
cd "$(dirname "$0")/.."

FLAGS=(
  -O
  --enable-reference-types
  --enable-bulk-memory
  --enable-nontrapping-float-to-int
  --enable-sign-ext
  --enable-mutable-globals
)

VERSION=$(node -p 'require("./node_modules/binaryen/package.json").version.split(".")[0]')

# `pnpm run` and `node --run` put node_modules/.bin first in PATH, so skip it
native_wasm_opt() {
  local bin
  while read -r bin; do
    case "$bin" in */node_modules/*) continue ;; esac
    if [[ "$("$bin" --version 2> /dev/null)" == *"(version_$VERSION)"* ]]; then
      echo "$bin"
      return
    fi
  done < <(
    type -ap wasm-opt || true
    echo "$PWD/target/binaryen/binaryen-version_$VERSION/bin/wasm-opt"
  )
}

sha256() {
  if command -v sha256sum > /dev/null; then sha256sum; else shasum -a 256; fi | cut -d' ' -f1
}

# The output only depends on the input, the binaryen version and the flags in
# this file: reuse the last output when none of them changed
CACHE_DIR=target/wasm-opt
CACHE="$CACHE_DIR/$({ sha256 < "$1"; echo "$VERSION"; sha256 < "$SELF"; } | sha256).wasm"

if [ "${WASM_OPT_NPM:-}" != "1" ] && [ -f "$CACHE" ]; then
  echo "      input did not change, reusing $CACHE"
  cp "$CACHE" "$2"
  exit 0
fi

NATIVE=""
if [ "${WASM_OPT_NPM:-}" != "1" ]; then
  NATIVE=$(native_wasm_opt)
fi

if [ -n "$NATIVE" ]; then
  echo "      native wasm-opt version_$VERSION ($NATIVE)"
  "$NATIVE" "${FLAGS[@]}" "$1" -o "$2"
else
  if [ "${WASM_OPT_NPM:-}" != "1" ]; then
    echo "      native wasm-opt version_$VERSION not found, using the npm package (slower, run \`pnpm setup\`)"
  fi
  pnpm exec wasm-opt "${FLAGS[@]}" "$1" -o "$2"
fi

if [ "${WASM_OPT_NPM:-}" != "1" ]; then
  rm -rf "$CACHE_DIR"
  mkdir -p "$CACHE_DIR"
  cp "$2" "$CACHE"
fi
