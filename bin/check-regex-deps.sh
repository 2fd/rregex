#!/usr/bin/env bash
# Verifies that the regex engine crates in Cargo.lock were all published
# no later than the locked `regex` version itself, so every release line runs
# the regex engine exactly as it existed when that regex version came out.
#
# Checked crates: regex-syntax, regex-automata (regex >= 1.9 only).
# Each crate must appear exactly once in Cargo.lock.
set -euo pipefail

LOCK="${1:-Cargo.lock}"
UA="rregex-ci (https://github.com/2fd/rregex)"

locked_version() {
  local versions count
  versions=$(awk -v c="\"$1\"" '/^name = /{n=$3} /^version = /{if(n==c){gsub(/"/,"",$3); print $3}}' "$LOCK")
  count=$(printf '%s\n' "$versions" | grep -c . || true)
  if [ "$count" -gt 1 ]; then
    echo "❌ $1 is locked more than once: $(echo $versions)" >&2
    return 1
  fi
  printf '%s' "$versions"
}

published_at() {
  curl -fsSL -A "$UA" "https://crates.io/api/v1/crates/$1/$2" | jq -er '.version.created_at'
}

regex_version=$(locked_version regex)
if [ -z "$regex_version" ]; then
  echo "❌ regex not found in $LOCK" >&2
  exit 1
fi

cutoff=$(published_at regex "$regex_version")
echo "regex $regex_version published at $cutoff"

status=0
for crate in regex-syntax regex-automata; do
  version=$(locked_version "$crate") || { status=1; continue; }
  [ -z "$version" ] && continue
  at=$(published_at "$crate" "$version")
  if [[ "$at" > "$cutoff" ]]; then
    echo "❌ $crate $version published at $at (after regex $regex_version)"
    status=1
  else
    echo "✅ $crate $version published at $at"
  fi
done

exit $status
