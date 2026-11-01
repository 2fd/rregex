#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

CARGO_VERSION=$(cargo version 2> /dev/null || true)

## Install rust if is missing
if [ "$CARGO_VERSION" = "" ]; then
  echo "    📥 installing rust"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  CARGO_VERSION=$(cargo version)
fi

echo "    ✅ $CARGO_VERSION ($(which cargo))"
echo ""

rustup target add wasm32-unknown-unknown

## wasm-bindgen-cli must match the wasm-bindgen crate version in Cargo.lock
WASM_BINDGEN_REQUIRED=$(grep -A1 '^name = "wasm-bindgen"$' Cargo.lock | sed -n 's/^version = "\(.*\)"$/\1/p')
WASM_BINDGEN_VERSION=$(wasm-bindgen --version 2> /dev/null | cut -d' ' -f2 || true)

if [ "$WASM_BINDGEN_VERSION" != "$WASM_BINDGEN_REQUIRED" ]; then
  echo "    📥 installing wasm-bindgen-cli $WASM_BINDGEN_REQUIRED"
  cargo install wasm-bindgen-cli --version "$WASM_BINDGEN_REQUIRED" --locked --force
fi

echo "    ✅ wasm-bindgen $(wasm-bindgen --version | cut -d' ' -f2) ($(which wasm-bindgen))"
echo ""

WASM_PACK_VERSION=$(wasm-pack --version 2> /dev/null || true)

## wasm-pack is only used to run the Rust tests (pnpm test:rs)
if [ "$WASM_PACK_VERSION" = "" ]; then
  echo "    📥 installing wasm-pack"
  cargo install wasm-pack
  WASM_PACK_VERSION=$(wasm-pack --version)
fi

echo "    ✅ $WASM_PACK_VERSION ($(which wasm-pack))"
echo ""
