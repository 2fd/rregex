#!/bin/bash
# Usage: bin/wasm-opt.sh <input.wasm> <output.wasm>
#
# Optimizes the wasm with binaryen. It prefers a native `wasm-opt` with the
# same version as the `binaryen` npm package: same output, but multi-threaded
# and ~10x faster than the npm package, which is an emscripten (JS) build.
# Without one, it uses the npm package.
#
# WASM_OPT_NPM=1 always uses the npm package.
set -euo pipefail

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
  done < <(type -ap wasm-opt)
}

NATIVE=""
if [ "${WASM_OPT_NPM:-}" != "1" ]; then
  NATIVE=$(native_wasm_opt)
fi

if [ -n "$NATIVE" ]; then
  echo "      native wasm-opt version_$VERSION ($NATIVE)"
  "$NATIVE" "${FLAGS[@]}" "$1" -o "$2"
else
  if [ "${WASM_OPT_NPM:-}" != "1" ]; then
    echo "      native wasm-opt version_$VERSION not found, using the npm package (slower)"
  fi
  pnpm exec wasm-opt "${FLAGS[@]}" "$1" -o "$2"
fi
