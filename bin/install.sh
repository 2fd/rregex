#!/bin/bash
CARGO_VERSION=$(cargo version)

## Install rust if is missing
if [ "$CARGO_VERSION" = "" ]; then
  echo "    ➡️ installing rust"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
else
  echo "    ✅ $CARGO_VERSION"
fi

WASM_PACK_VERSION=$(wasm-pack --version)

## Install wasm-pack if is missing
if [ "$WASM_PACK_VERSION" = "" ]; then
  echo "    ➡️ installing wasm-pack"
  cargo install wasm-pack
else
  echo "    ✅ $WASM_PACK_VERSION"
fi

echo ""
