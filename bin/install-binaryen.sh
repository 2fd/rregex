#!/bin/bash
# Usage: bin/install-binaryen.sh <dir>
#
# Downloads the native binaryen release with the same version as the
# `binaryen` npm package to <dir>, checks its sha256 and prints its bin
# directory. bin/wasm-opt.sh uses that `wasm-opt` when it is in PATH.
set -euo pipefail

cd "$(dirname "$0")/.."

DIR=$1
VERSION="version_$(node -p 'require("./node_modules/binaryen/package.json").version.split(".")[0]')"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) PLATFORM=x86_64-linux ;;
  Linux-aarch64 | Linux-arm64) PLATFORM=aarch64-linux ;;
  Darwin-x86_64) PLATFORM=x86_64-macos ;;
  Darwin-arm64) PLATFORM=arm64-macos ;;
  *)
    echo "no binaryen release for $(uname -s) $(uname -m)" >&2
    exit 1
    ;;
esac

TARBALL="binaryen-$VERSION-$PLATFORM.tar.gz"
URL="https://github.com/WebAssembly/binaryen/releases/download/$VERSION/$TARBALL"

mkdir -p "$DIR"
cd "$DIR"
curl -fsSLO "$URL"
curl -fsSLO "$URL.sha256"
if command -v sha256sum > /dev/null; then
  sha256sum -c "$TARBALL.sha256" >&2
else
  shasum -a 256 -c "$TARBALL.sha256" >&2
fi
tar xzf "$TARBALL"
rm "$TARBALL" "$TARBALL.sha256"

echo "$PWD/binaryen-$VERSION/bin"
