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

## prebuilt binaries with cargo-binstall when it is installed;
## `cargo install` compiles each one (~1-2 min)
cargo_install() {
  if cargo binstall -V > /dev/null 2>&1; then
    cargo binstall --no-confirm "$@"
  else
    cargo install "$@"
  fi
}

## wasm-bindgen-cli must match the wasm-bindgen crate version in Cargo.lock
WASM_BINDGEN_REQUIRED=$(grep -A1 '^name = "wasm-bindgen"$' Cargo.lock | sed -n 's/^version = "\(.*\)"$/\1/p')
WASM_BINDGEN_VERSION=$(wasm-bindgen --version 2> /dev/null | cut -d' ' -f2 || true)

if [ "$WASM_BINDGEN_VERSION" != "$WASM_BINDGEN_REQUIRED" ]; then
  echo "    📥 installing wasm-bindgen-cli $WASM_BINDGEN_REQUIRED"
  cargo_install wasm-bindgen-cli --version "$WASM_BINDGEN_REQUIRED" --locked --force
fi

echo "    ✅ wasm-bindgen $(wasm-bindgen --version | cut -d' ' -f2) ($(which wasm-bindgen))"
echo ""

WASM_PACK_VERSION=$(wasm-pack --version 2> /dev/null || true)

## wasm-pack is only used to run the Rust tests (pnpm test:rs)
if [ "$WASM_PACK_VERSION" = "" ]; then
  echo "    📥 installing wasm-pack"
  cargo_install wasm-pack
  WASM_PACK_VERSION=$(wasm-pack --version)
fi

echo "    ✅ $WASM_PACK_VERSION ($(which wasm-pack))"
echo ""

## native wasm-opt with the version of the binaryen npm package (bin/wasm-opt.sh)
BINARYEN_REQUIRED="version_$(node -p 'require("./node_modules/binaryen/package.json").version.split(".")[0]')"
WASM_OPT="target/binaryen/binaryen-$BINARYEN_REQUIRED/bin/wasm-opt"

if [ ! -x "$WASM_OPT" ]; then
  echo "    📥 installing binaryen $BINARYEN_REQUIRED"
  ./bin/install-binaryen.sh target/binaryen > /dev/null
fi

echo "    ✅ $("$WASM_OPT" --version) ($WASM_OPT)"
echo ""
