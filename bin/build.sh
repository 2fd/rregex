#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

TARGET=wasm32-unknown-unknown
WASM="target/$TARGET/release/rregex.wasm"

echo "  🦀  Compiling wasm..."
cargo build --release --target "$TARGET"

echo "  🔗  Generating bindings..."
rm -rf js/wasm lib
wasm-bindgen --target web --omit-default-module-path \
  --out-dir js/wasm --out-name rregex "$WASM"
node bin/metadata.mjs

echo "  🗜️   Optimizing wasm..."
mkdir -p lib
pnpm exec wasm-opt -O --enable-reference-types --enable-bulk-memory \
  --enable-nontrapping-float-to-int --enable-sign-ext --enable-mutable-globals \
  js/wasm/rregex_bg.wasm -o lib/rregex.wasm

echo "  📦  Bundling..."
pnpm exec tsdown --silent

echo "  ✅  Done!"
