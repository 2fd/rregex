#!/bin/bash
# Builds lib/. Prints the time of each step. With BUILD_TIMINGS=<file>, it also
# writes them to <file> as JSON: { "steps": [{ "name", "ms" }], "total": ms }.
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

STEPS=()
STARTED=$(now_ms)
STEP_NAME=""
STEP_START=0

step() {
  end_step
  echo "  $1"
  STEP_NAME=$2
  STEP_START=$(now_ms)
}

end_step() {
  [ -n "$STEP_NAME" ] || return 0
  local ms=$(($(now_ms) - STEP_START))
  STEPS+=("{\"name\":\"$STEP_NAME\",\"ms\":$ms}")
  echo "      ⏱️  $STEP_NAME: $((ms / 1000)).$(printf '%03d' $((ms % 1000)))s"
  STEP_NAME=""
}

step "🦀  Compiling wasm..." "cargo build"
cargo build --release --target "$TARGET"

step "🔗  Generating bindings..." "wasm-bindgen"
rm -rf js/wasm lib
wasm-bindgen --target web --omit-default-module-path \
  --out-dir js/wasm --out-name rregex "$WASM"
node bin/metadata.mjs

step "🗜️   Optimizing wasm..." "wasm-opt"
mkdir -p lib
./bin/wasm-opt.sh js/wasm/rregex_bg.wasm lib/rregex.wasm

step "📦  Bundling..." "tsdown"
pnpm exec tsdown --silent

end_step
TOTAL=$(($(now_ms) - STARTED))

if [ -n "${BUILD_TIMINGS:-}" ]; then
  (
    IFS=,
    echo "{\"steps\":[${STEPS[*]}],\"total\":$TOTAL}"
  ) > "$BUILD_TIMINGS"
fi

echo "  ✅  Done in $((TOTAL / 1000)).$(printf '%03d' $((TOTAL % 1000)))s!"
