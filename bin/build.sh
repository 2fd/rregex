#!/bin/bash
# Builds lib/. Prints the time of each step. With BUILD_TIMINGS=<file>, it also
# writes them to <file> as JSON: { "steps": [{ "name", "ms" }], "total": ms }.
# wasm-opt and tsdown run in parallel, so the total is less than the sum.
set -euo pipefail

cd "$(dirname "$0")/.."

TARGET=wasm32-unknown-unknown
WASM="target/$TARGET/release/rregex.wasm"

# milliseconds; whole seconds where `date` has no %N
now_ms() {
  local ns
  ns=$(date +%s%N)
  case "$ns" in
    *[!0-9]*) echo $(($(date +%s) * 1000)) ;;
    *) echo $((ns / 1000000)) ;;
  esac
}

seconds() {
  echo "$(($1 / 1000)).$(printf '%03d' $(($1 % 1000)))s"
}

mkdir -p target
TIMES=target/build-times.txt
: > "$TIMES"

# timed <name> <command...>: runs the command and records its time
timed() {
  local name=$1 start ms
  shift
  start=$(now_ms)
  "$@"
  ms=$(($(now_ms) - start))
  echo "$name $ms" >> "$TIMES"
  echo "      ⏱️  $name: $(seconds "$ms")"
}

bindings() {
  rm -rf js/wasm lib
  wasm-bindgen --target web --omit-default-module-path \
    --out-dir js/wasm --out-name rregex "$WASM"
  node bin/metadata.mjs
  mkdir -p lib
}

STARTED=$(now_ms)

echo "  🦀  Compiling wasm..."
timed "cargo build" cargo build --release --target "$TARGET"

echo "  🔗  Generating bindings..."
timed "wasm-bindgen" bindings

# tsdown only reads js/: lib/rregex.wasm is never bundled
echo "  🗜️   Optimizing wasm and 📦 bundling..."
timed "wasm-opt" ./bin/wasm-opt.sh js/wasm/rregex_bg.wasm lib/rregex.wasm &
WASM_OPT=$!
timed "tsdown" pnpm exec tsdown --silent
wait "$WASM_OPT"

TOTAL=$(($(now_ms) - STARTED))

if [ -n "${BUILD_TIMINGS:-}" ]; then
  STEPS=()
  for name in "cargo build" "wasm-bindgen" "wasm-opt" "tsdown"; do
    STEPS+=("{\"name\":\"$name\",\"ms\":$(grep "^$name " "$TIMES" | awk '{print $NF}')}")
  done
  (
    IFS=,
    echo "{\"steps\":[${STEPS[*]}],\"total\":$TOTAL}"
  ) > "$BUILD_TIMINGS"
fi

echo "  ✅  Done in $(seconds "$TOTAL")!"
