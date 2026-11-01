#!/usr/bin/env bash
# Fails when the next rregex version does not share major.minor with the
# locked `regex` crate: rregex X.Y.* must always ship regex X.Y.*.
#
# Usage: bin/check-release-version.sh <next-version> [Cargo.lock]
# Run by semantic-release (verifyRelease) before anything is published.
set -euo pipefail

next="${1:?usage: $0 <next-version> [Cargo.lock]}"
LOCK="${2:-Cargo.lock}"

regex_version=$(awk '/^name = /{n=$3} /^version = /{if(n=="\"regex\""){gsub(/"/,"",$3); print $3}}' "$LOCK")
if [ -z "$regex_version" ] || [ "$(printf '%s\n' "$regex_version" | wc -l)" -ne 1 ]; then
  echo "❌ expected exactly one regex entry in $LOCK, got: ${regex_version:-none}" >&2
  exit 1
fi

if [ "${next%.*}" != "${regex_version%.*}" ]; then
  echo "❌ rregex $next does not match regex $regex_version (major.minor must be ${regex_version%.*})" >&2
  echo "   Use feat(regex): only for commits that upgrade the regex minor." >&2
  exit 1
fi

echo "✅ rregex $next matches regex $regex_version"
