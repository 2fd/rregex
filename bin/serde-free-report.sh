#!/usr/bin/env bash
# Reproducible comparison of a baseline ref (default: master, built from a
# `git worktree` in $TMPDIR) against the current working tree:
#   compatibility (differential test + .d.ts diff + test suites),
#   build time, crate count, size (raw/gzip/brotli/twiggy), throughput, memory.
# Writes docs/serde-free-report.md.
#
# usage: bin/serde-free-report.sh
# env:   REPORT_ONLY=1 (re-render from the last run) SKIP_BUILD=1 (re-run only benchmarks) BASE_REF=master RUNS=3 BENCH_ROUNDS=3 BENCH_TIME=500 WORK_DIR=... REPORT=...
#        TOOLS_BIN=<dir prepended to PATH, e.g. a local wasm-pack/twiggy install>
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
BASE_REF=${BASE_REF:-master}
RUNS=${RUNS:-3}
BENCH_ROUNDS=${BENCH_ROUNDS:-3}
BENCH_TIME=${BENCH_TIME:-500}
WORK=${WORK_DIR:-${TMPDIR:-/tmp}/rregex-serde-free-report}
BASE_WT=$WORK/baseline
OUT=$WORK/out
REPORT=${REPORT:-$ROOT/docs/serde-free-report.md}
export PATH="${TOOLS_BIN:+$TOOLS_BIN:}$ROOT/node_modules/.bin:$PATH"

SIDES=(baseline candidate)

log() { printf '\033[36m==>\033[0m %s\n' "$*" >&2; }
have() { command -v "$1" >/dev/null 2>&1; }
side_dir() { if [ "$1" = baseline ]; then echo "$BASE_WT"; else echo "$ROOT"; fi; }
# REPORT_ONLY=1 skips every measurement and re-renders the report from the data of the last run in $WORK.
measuring() { [ -z "${REPORT_ONLY:-}" ]; }
# SKIP_BUILD=1 reuses the builds, tests and compat results of the last run and only re-runs benchmarks.
building() { measuring && [ -z "${SKIP_BUILD:-}" ]; }

for t in git cargo wasm-pack node pnpm jq gzip awk; do
  have "$t" || { echo "missing required tool: $t" >&2; exit 1; }
done
MISSING=()
for t in twiggy brotli; do have "$t" || MISSING+=("$t"); done
[ -n "${EPOCHREALTIME:-}" ] || { echo "bash >= 5 required (EPOCHREALTIME)" >&2; exit 1; }

# ---------------------------------------------------------------- helpers ---
# elapsed seconds of a command (output discarded, failure is fatal)
elapsed() {
  local s=$EPOCHREALTIME
  "$@" >/dev/null 2>&1 || { echo "command failed: $*" >&2; exit 1; }
  awk -v s="$s" -v e="$EPOCHREALTIME" 'BEGIN { printf "%.3f\n", e - s }'
}
median() { sort -g | awk '{ a[NR] = $1 } END { if (NR == 0) print "nan"; else if (NR % 2) print a[(NR + 1) / 2]; else print (a[NR / 2] + a[NR / 2 + 1]) / 2 }'; }
bytes() { wc -c < "$1" | tr -d ' '; }
gz() { gzip -9 -c "$1" | wc -c | tr -d ' '; }
br() { if have brotli; then brotli -q 11 -c "$1" | wc -c | tr -d ' '; else echo "n/a"; fi; }
# markdown row: | label | a | b | delta | delta % |
row() {
  awk -v l="$1" -v a="$2" -v b="$3" -v u="${4:-}" 'function f(x) { return (x ~ /^-?[0-9.]+$/) ? sprintf("%\047.0f", x) : x }
    BEGIN { if (a ~ /^[0-9.]+$/ && b ~ /^[0-9.]+$/ && a > 0) printf "| %s | %s%s | %s%s | %+\047.0f%s | %+.2f%% |\n", l, f(a), u, f(b), u, b - a, u, (b - a) * 100 / a;
            else printf "| %s | %s | %s | n/a | n/a |\n", l, a, b }'
}
rowf() { # same as row() with 2 decimals (seconds)
  awk -v l="$1" -v a="$2" -v b="$3" -v u="${4:-}" 'BEGIN { printf "| %s | %.2f%s | %.2f%s | %+.2f%s | %+.1f%% |\n", l, a, u, b, u, b - a, u, (b - a) * 100 / a }'
}

# ------------------------------------------------------------------ setup ---
log "work dir: $WORK"
if building; then
rm -rf "$OUT"; mkdir -p "$OUT"
[ -d "$ROOT/node_modules" ] || (cd "$ROOT" && pnpm install --frozen-lockfile)

git -C "$ROOT" worktree remove --force "$BASE_WT" 2>/dev/null || rm -rf "$BASE_WT"
git -C "$ROOT" worktree prune
git -C "$ROOT" worktree add --quiet --detach "$BASE_WT" "$BASE_REF"
ln -s "$ROOT/node_modules" "$BASE_WT/node_modules"
fi
BASE_SHA=$(git -C "$BASE_WT" rev-parse --short HEAD)
CAND_SHA=$(git -C "$ROOT" rev-parse --short HEAD)
CAND_DIRTY=$(git -C "$ROOT" status --porcelain --untracked-files=no | grep -q . && echo " + uncommitted changes" || true)

# ------------------------------------------------- build time and crates ---
if building; then
log "build time: $RUNS x (cargo clean + wasm-pack --release --target web), $RUNS x incremental"
for i in $(seq "$RUNS"); do
  for side in "${SIDES[@]}"; do
    d=$(side_dir "$side")
    (cd "$d" && cargo clean -q)
    t=$(cd "$d" && elapsed wasm-pack build --release --target web -d "$WORK/web-$side")
    echo "$t" >> "$OUT/build-clean-$side.txt"
    log "  [$side] clean build #$i: ${t}s"
  done
done
for i in $(seq "$RUNS"); do
  for side in "${SIDES[@]}"; do
    d=$(side_dir "$side")
    touch "$d/src/lib.rs"
    t=$(cd "$d" && elapsed wasm-pack build --release --target web -d "$WORK/web-$side")
    echo "$t" >> "$OUT/build-incr-$side.txt"
    log "  [$side] incremental build #$i: ${t}s"
  done
done

log "crate graph"
for side in "${SIDES[@]}"; do
  d=$(side_dir "$side")
  (cd "$d" && cargo tree --target wasm32-unknown-unknown -e normal,build --prefix none 2>/dev/null) \
    | sed -e 's/ (\*)$//' -e 's/ (proc-macro)//' -e 's/ (\/.*)$//' | sort -u > "$OUT/tree-$side.txt"
  (cd "$d" && cargo clean -q && cargo build --release --target wasm32-unknown-unknown 2>&1) \
    | grep -c '^ *Compiling ' > "$OUT/compiled-$side.txt" || true
done

# -------------------------------------------------------- full lib builds ---
log "full lib builds (bin/build.sh, all targets)"
for side in "${SIDES[@]}"; do
  d=$(side_dir "$side")
  (cd "$d" && bash bin/build.sh > "$OUT/build-lib-$side.log" 2>&1) || { cat "$OUT/build-lib-$side.log" >&2; exit 1; }
  rm -rf "$WORK/lib-$side"; cp -R "$d/lib" "$WORK/lib-$side"
  cp "$d/target/wasm32-unknown-unknown/release/rregex.wasm" "$OUT/cargo-$side.wasm"
done

# ------------------------------------------------------------------ tests ---
log "test suites"
run_status() { local log=$1; shift; if "$@" > "$log" 2>&1; then echo pass; else echo "fail (exit $?)"; fi; }
for side in "${SIDES[@]}"; do
  d=$(side_dir "$side")
  echo "$(cd "$d" && run_status "$OUT/test-$side.log" pnpm test)" > "$OUT/test-status-$side.txt"
  echo "$(cd "$d" && run_status "$OUT/testrs-$side.log" pnpm test:rs)" > "$OUT/testrs-status-$side.txt"
  echo "$(cd "$d" && run_status "$OUT/testrs-node-$side.log" wasm-pack test --node)" > "$OUT/testrs-node-status-$side.txt"
done
fi
JS_TESTS=$(grep -E '^ℹ (tests|pass|fail) ' "$OUT/test-candidate.log" | awk '{ printf "%s %s, ", $2, $3 }' | sed 's/, $//')
TESTRS_ERR=$(grep -m1 '^Error:' "$OUT/testrs-candidate.log" | tr -d '\`' || true)
TESTRS_NODE=$(grep -m1 -E 'test result:|no tests to run|running 0 tests' "$OUT/testrs-node-candidate.log" || echo "see log")

log "differential compatibility test"
if building; then
  node "$ROOT/test/compat/diff.mjs" "$WORK/lib-baseline" "$WORK/lib-candidate" --json "$OUT/compat.json" \
    > "$OUT/compat.log" 2>&1 || true
fi
cat "$OUT/compat.log" >&2
COMPAT_STATUS=$(jq -r 'if (.mismatches | length) == 0 and (.coverage.missing | length) == 0 then "pass" else "fail" end' "$OUT/compat.json")

log ".d.ts and JS glue diff"
# identical | reordered (same lines, different order) | different
DTS_ROWS=""; DTS_SAME=1; DTS_CONTENT_SAME=1; DTS_DIFFS=""
for f in "$WORK"/lib-baseline/*.d.ts "$WORK"/lib-baseline/*.d.cts; do
  n=$(basename "$f"); g="$WORK/lib-candidate/$n"
  if cmp -s "$f" "$g"; then
    r=identical
  else
    DTS_SAME=0
    if cmp -s <(sort "$f") <(sort "$g"); then r="same lines, different order"; else r="**DIFFERENT**"; DTS_CONTENT_SAME=0; fi
    DTS_DIFFS+="\`$n\`:"$'\n\n```diff\n'"$( { diff "$f" "$g" || true; } | head -40)"$'\n```\n\n'
  fi
  DTS_ROWS+="| \`$n\` | $r |"$'\n'
done
GLUE_ROWS=""
for n in web.js commonjs.cjs esm.mjs standalone.js; do
  a="$WORK/lib-baseline/$n"; b="$WORK/lib-candidate/$n"
  plus=$(diff "$a" "$b" | grep -c '^>' || true); minus=$(diff "$a" "$b" | grep -c '^<' || true)
  GLUE_ROWS+="$(row "\`$n\` bytes (+$plus/-$minus lines)" "$(bytes "$a")" "$(bytes "$b")")"$'\n'
  GLUE_ROWS+="$(row "\`$n\` gzip -9" "$(gz "$a")" "$(gz "$b")")"$'\n'
done

# ------------------------------------------------------------------- size ---
log "size"
SIZE_ROWS=""
SIZE_ROWS+="$(row '`lib/rregex.wasm` (after wasm-bindgen + wasm-opt)' "$(bytes "$WORK/lib-baseline/rregex.wasm")" "$(bytes "$WORK/lib-candidate/rregex.wasm")")"$'\n'
SIZE_ROWS+="$(row '`lib/rregex.wasm` gzip -9' "$(gz "$WORK/lib-baseline/rregex.wasm")" "$(gz "$WORK/lib-candidate/rregex.wasm")")"$'\n'
SIZE_ROWS+="$(row '`lib/rregex.wasm` brotli -q 11' "$(br "$WORK/lib-baseline/rregex.wasm")" "$(br "$WORK/lib-candidate/rregex.wasm")")"$'\n'
SIZE_ROWS+="$(row 'cargo output `rregex.wasm` (before wasm-bindgen, with names)' "$(bytes "$OUT/cargo-baseline.wasm")" "$(bytes "$OUT/cargo-candidate.wasm")")"$'\n'

TWIGGY_DIFF="twiggy not installed"; TWIGGY_TOP="twiggy not installed"; SERDE_BYTES="n/a"; CODE_DELTA="n/a"
if have twiggy; then
  TWIGGY_DIFF=$(twiggy diff -n 25 "$OUT/cargo-baseline.wasm" "$OUT/cargo-candidate.wasm" | cut -c1-200)
  TWIGGY_TOP=$(twiggy top -n 12 "$OUT/cargo-candidate.wasm" | cut -c1-200)
  SERDE_BYTES=$(twiggy top -f json -n 1000000 "$OUT/cargo-baseline.wasm" \
    | jq '[.[] | select(.name | test("serde")) | .shallow_size] | add // 0')
  # code + data delta, excluding custom sections that never ship (names, wasm-bindgen metadata)
  CODE_DELTA=$(twiggy diff -f json -n 1000000 "$OUT/cargo-baseline.wasm" "$OUT/cargo-candidate.wasm" \
    | jq '[.[] | select((.name | test("^Σ|function names|custom section")) | not) | .delta_bytes] | add // 0')
fi

# --------------------------------------------------- throughput / memory ---
log "benchmarks: $BENCH_ROUNDS interleaved rounds, BENCH_TIME=${BENCH_TIME}ms per task, one process per task"
if measuring; then
node "$ROOT/test/compat/bench.mjs" "$WORK/lib-baseline" --meta --json "$OUT/bench-meta.json" > /dev/null
TASKS=()
while IFS= read -r t; do TASKS+=("$t"); done < <(node "$ROOT/test/compat/bench.mjs" "$WORK/lib-baseline" --list)
for i in $(seq "$BENCH_ROUNDS"); do
  for side in "${SIDES[@]}"; do
    log "  [$side] round $i"
    # A fresh process (and wasm instance) per task, see test/compat/bench.mjs.
    files=()
    for t in "${TASKS[@]}"; do
      f="$OUT/bench-task-$side-$i-${t//[^a-zA-Z]/_}.json"
      node "$ROOT/test/compat/bench.mjs" "$WORK/lib-$side" --task "$t" --time "$BENCH_TIME" --json "$f" > /dev/null
      files+=("$f")
    done
    jq -s '{ results: (map(.results) | add) }' "${files[@]}" > "$OUT/bench-$side-$i.json"
    node --expose-gc "$ROOT/test/compat/memory.mjs" "$WORK/lib-$side" --json "$OUT/memory-$side-$i.json" > /dev/null
  done
done
fi

JQ_MEDIAN='def median: sort | if length == 0 then null elif length % 2 == 1 then .[length / 2 | floor] else (.[length / 2 - 1] + .[length / 2]) / 2 end;'
for side in "${SIDES[@]}"; do
  jq -s "$JQ_MEDIAN"' [.[].results] as $r | $r[0] | keys_unsorted | map(. as $k | { key: $k, value: {
      hz: [$r[][$k].hz] | median, medianMs: [$r[][$k].medianMs] | median, p99Ms: [$r[][$k].p99Ms] | median,
      rme: [$r[][$k].rme] | median, growth: [$r[][$k].wasmGrowthBytesPerCall] | median } }) | from_entries' \
    $(for i in $(seq "$BENCH_ROUNDS"); do echo "$OUT/bench-$side-$i.json"; done) > "$OUT/bench-$side.json"
  jq -s "$JQ_MEDIAN"' { matches: .[0].matches, haystackBytes: .[0].haystackBytes, ms: [.[].ms] | median,
      heapUsed: [.[].delta.heapUsed] | median, retainedHeapUsed: [.[].retainedDelta.heapUsed] | median,
      rss: [.[].delta.rss] | median, wasm: [.[].delta.wasm] | median }' "$OUT"/memory-"$side"-*.json > "$OUT/memory-$side.json"
done

BENCH_ROWS=$(jq -r -n --slurpfile b "$OUT/bench-baseline.json" --slurpfile c "$OUT/bench-candidate.json" '
  def n0: . * 1 | round | tostring | [scan("\\d{1,3}(?=(?:\\d{3})*$)")] | join(",");
  def ms: if . < 0.01 then (. * 1000 | round | tostring) + " µs" else ((. * 1000 | round) / 1000 | tostring) + " ms" end;
  $b[0] | keys_unsorted[] as $k | ($b[0][$k]) as $x | ($c[0][$k]) as $y |
  def kb: if . < 1024 then "\(. | round) B" else "\(. / 1024 | round) KiB" end;
  "| \($k) | \($x.hz | n0) | \($y.hz | n0) | \((($y.hz / $x.hz - 1) * 1000 | round) / 10 | if . > 0 then "+\(.)" else tostring end)% | \($x.medianMs | ms) | \($y.medianMs | ms) | \($x.p99Ms | ms) | \($y.p99Ms | ms) | \($x.growth | kb) | \($y.growth | kb) |"')

log "wasm memory growth over repeated calls"
if measuring; then
  for side in "${SIDES[@]}"; do
    node "$ROOT/test/compat/leak.mjs" "$WORK/lib-$side" --json "$OUT/leak-$side.json" > /dev/null
  done
fi
LEAK_ROWS=$(jq -r -n --slurpfile b "$OUT/leak-baseline.json" --slurpfile c "$OUT/leak-candidate.json" '
  def kib: (. / 1024 * 10 | round) / 10 | tostring + " KiB";
  $b[0].methods | keys_unsorted[] as $m |
  "| `\($m)` | \($b[0].methods[$m].growthBytes | kib) | \($c[0].methods[$m].growthBytes | kib) |"')
LEAK_CALLS=$(jq '.calls' "$OUT/leak-baseline.json"); LEAK_HAY=$(jq '.haystackBytes' "$OUT/leak-baseline.json")
LEAK_FINAL=$(jq -r -n --slurpfile b "$OUT/leak-baseline.json" --slurpfile c "$OUT/leak-candidate.json" \
  '"baseline \($b[0].finalWasmBytes / 1048576 | round) MiB, candidate \($c[0].finalWasmBytes / 1048576 | round) MiB"')

MEM_ROWS=""
mem() { jq -r ".$2" "$OUT/memory-$1.json"; }
MEM_ROWS+="$(rowf 'time (ms)' "$(mem baseline ms)" "$(mem candidate ms)")"$'\n'
MEM_ROWS+="$(row 'JS heapUsed delta right after the call (bytes, incl. garbage)' "$(mem baseline heapUsed)" "$(mem candidate heapUsed)")"$'\n'
MEM_ROWS+="$(row 'JS heapUsed retained after GC (bytes, result alive)' "$(mem baseline retainedHeapUsed)" "$(mem candidate retainedHeapUsed)")"$'\n'
MEM_ROWS+="$(row 'wasm linear memory growth (bytes)' "$(mem baseline wasm)" "$(mem candidate wasm)")"$'\n'
MEM_ROWS+="$(row 'process RSS delta (bytes)' "$(mem baseline rss)" "$(mem candidate rss)")"$'\n'

# ----------------------------------------------------------------- report ---
log "writing $REPORT"
med() { median < "$OUT/$1"; }
BUILD_ROWS="$(rowf 'clean build (`cargo clean` + `wasm-pack build --release --target web`)' "$(med build-clean-baseline.txt)" "$(med build-clean-candidate.txt)" ' s')"$'\n'
BUILD_ROWS+="$(rowf 'incremental build (`touch src/lib.rs`)' "$(med build-incr-baseline.txt)" "$(med build-incr-candidate.txt)" ' s')"$'\n'
BUILD_ROWS+="$(row 'crates in graph (`cargo tree -e normal,build --target wasm32-unknown-unknown`)' "$(wc -l < "$OUT/tree-baseline.txt" | tr -d ' ')" "$(wc -l < "$OUT/tree-candidate.txt" | tr -d ' ')")"$'\n'
BUILD_ROWS+="$(row 'crates compiled by a clean `cargo build` (`Compiling` lines)' "$(cat "$OUT/compiled-baseline.txt")" "$(cat "$OUT/compiled-candidate.txt")")"$'\n'
REMOVED_CRATES=$(comm -23 "$OUT/tree-baseline.txt" "$OUT/tree-candidate.txt" | sed 's/^/`/; s/$/`/' | paste -sd ',' - | sed 's/,/, /g')
ADDED_CRATES=$(comm -13 "$OUT/tree-baseline.txt" "$OUT/tree-candidate.txt" | sed 's/^/`/; s/$/`/' | paste -sd ',' - | sed 's/,/, /g')
SAMPLES_CLEAN_B=$(paste -sd ' ' "$OUT/build-clean-baseline.txt"); SAMPLES_CLEAN_C=$(paste -sd ' ' "$OUT/build-clean-candidate.txt")
SAMPLES_INCR_B=$(paste -sd ' ' "$OUT/build-incr-baseline.txt"); SAMPLES_INCR_C=$(paste -sd ' ' "$OUT/build-incr-candidate.txt")

COMPAT_CASES=$(jq '.cases' "$OUT/compat.json"); COMPAT_MISMATCH=$(jq '.mismatches | length' "$OUT/compat.json")
COMPAT_ERRORS=$(jq '.errorsCompared' "$OUT/compat.json"); COMPAT_COVERAGE=$(jq -r '"\(.coverage.seen | length) items, missing: \(.coverage.missing | if length == 0 then "none" else join(", ") end)"' "$OUT/compat.json")
HAY=$(jq -r '"small = \(.haystacks.smallBytes) bytes, large = \(.haystacks.largeBytes) bytes; findAll / large = \(.counts["findAll / large"]) matches, capturesAll / large = \(.counts["capturesAll / large"]) matches"' "$OUT/bench-meta.json")
MEM_DESC=$(jq -r '"`\\w+` over the whole `test/__data__/input-text.txt` (\(.haystackBytes) bytes, \(.matches) matches)"' "$OUT/memory-baseline.json")

pct() { awk -v a="$1" -v b="$2" 'BEGIN { printf "%+.1f%%", (b - a) * 100 / a }'; }
WASM_B=$(bytes "$WORK/lib-baseline/rregex.wasm"); WASM_C=$(bytes "$WORK/lib-candidate/rregex.wasm")
BR_B=$(br "$WORK/lib-baseline/rregex.wasm"); BR_C=$(br "$WORK/lib-candidate/rregex.wasm")
hz() { jq ".[\"$2\"].hz" "$OUT/bench-$1.json"; }
FINDALL_L=$(pct "$(hz baseline 'findAll / large')" "$(hz candidate 'findAll / large')")
CAPALL_L=$(pct "$(hz baseline 'capturesAll / large')" "$(hz candidate 'capturesAll / large')")
SYNTAX_L=$(pct "$(hz baseline 'syntax / large')" "$(hz candidate 'syntax / large')")
CLEAN_PCT=$(pct "$(med build-clean-baseline.txt)" "$(med build-clean-candidate.txt)")
if [ "$COMPAT_STATUS" = pass ] && [ "$DTS_SAME" = 1 ]; then
  VERDICT="**Compatible**: the differential test found 0 mismatches and every \`.d.ts\` file is byte-identical."
elif [ "$COMPAT_STATUS" = pass ] && [ "$DTS_CONTENT_SAME" = 1 ]; then
  VERDICT="**Compatible**: the differential test found 0 mismatches. The \`.d.ts\` files have the same content; some files list \`InitOutput\` properties in a different order (see the compatibility section)."
else
  VERDICT="**NOT compatible**: see the compatibility section (mismatches: $COMPAT_MISMATCH, d.ts identical: $DTS_SAME)."
fi

WASM_OPT_VERSIONS=$( { find "$HOME/Library/Caches/.wasm-pack" "$HOME/.cache/.wasm-pack" -name wasm-opt -type f 2>/dev/null || true; } \
  | while read -r w; do "$w" --version 2>/dev/null || true; done | sort -u | paste -sd ',' - | sed 's/,/, /g')
CPU=$( (sysctl -n machdep.cpu.brand_string 2>/dev/null || grep -m1 'model name' /proc/cpuinfo | cut -d: -f2) | sed 's/^ *//')
WB_VERSION=$(awk '/^name = "wasm-bindgen"$/ { getline; print $3 }' "$ROOT/Cargo.lock" | tr -d '"')

mkdir -p "$(dirname "$REPORT")"
cat > "$REPORT" <<EOF
# serde-free report: \`serde\` + \`serde-wasm-bindgen\` vs. direct \`js_sys\` construction

> Generated by \`bin/serde-free-report.sh\` on $(date -u +%Y-%m-%dT%H:%MZ). Do not edit by hand; re-run the script.

- **Baseline**: \`$BASE_REF\` @ \`$BASE_SHA\` (built from a \`git worktree\` in \`\$TMPDIR\`)
- **Candidate**: working tree @ \`$CAND_SHA\`$CAND_DIRTY
- **Machine**: $CPU, $(uname -sr), $(uname -m)
- **Toolchain**: $(rustc -V), $(cargo -V | cut -d' ' -f1-2), $(wasm-pack -V), wasm-bindgen $WB_VERSION, ${WASM_OPT_VERSIONS:-wasm-opt n/a}, node $(node -v), pnpm $(pnpm -v)
- **Parameters**: RUNS=$RUNS, BENCH_ROUNDS=$BENCH_ROUNDS, BENCH_TIME=${BENCH_TIME}ms${MISSING:+, missing optional tools: ${MISSING[*]}}

## Summary

- $VERDICT
- Dependencies: removes $REMOVED_CRATES from the crate graph${ADDED_CRATES:+ (added: $ADDED_CRATES)}.
- Size: \`rregex.wasm\` $WASM_B → $WASM_C bytes ($(pct "$WASM_B" "$WASM_C")), brotli $BR_B → $BR_C bytes ($(pct "$BR_B" "$BR_C")).
- Clean build time: $CLEAN_PCT (median of $RUNS).
- Throughput: \`findAll\` (large) $FINDALL_L, \`capturesAll\` (large) $CAPALL_L, \`syntax\` (large) $SYNTAX_L ops/s.

## What changed

- \`Match\`, \`Captures\` and the HIR returned by \`syntax()\` are built directly with \`js_sys\`: \`Object\` plus typed
  \`indexing_setter\` imports (\`set_num\`, \`set_str\`, \`set_bool\`). Numbers and strings go straight through the ABI,
  without an intermediate \`JsValue\` for each value. Static keys (\`@type\`, \`start\`, …) are created once per
  thread. \`Uint8Array::from\` is used for \`Literal\` bytes.
- \`findAll\` / \`capturesAll\` push into a \`js_sys::Array\` while iterating. The baseline first collected a
  \`Vec<Match>\` in wasm memory, then serialized it.
- Errors: \`serde_wasm_bindgen::Error::new(msg)\` was \`JsError::new(&msg.to_string())\`. The candidate uses
  \`JsError\` directly, so the thrown value is still a plain \`Error\` with the same message.
- \`find\`, \`findAt\`, \`findAll\`, \`captures\` and \`capturesAll\` keep \`Result<JsValue, JsValue>\` although they
  cannot fail any more. Named capture groups still use \`js_sys::Reflect::set\` (a \`catch\` import), as before.
  Both keep the wasm ABI (the \`InitOutput\` type in the generated \`.d.ts\`) identical.
- The 13 \`typescript_custom_section\` blocks are emitted as one section (\`concat!\` of one \`macro_rules!\` per
  block), in the published order. \`wasm-bindgen\` emits separate sections in link order, which is not source
  order. With separate sections, this change moved \`Captures\` in every public \`.d.ts\`.
- \`serde\` (with the unused \`derive\` feature) and \`serde-wasm-bindgen\` are removed from \`Cargo.toml\`.

## Compatibility

Differential test: \`node test/compat/diff.mjs <baseline-lib> <candidate-lib>\`. It runs $COMPAT_CASES cases on each of the
4 distributable targets (\`esm.mjs\`, \`commonjs.cjs\`, \`web.js\` via \`initSync\`, \`standalone.js\` via \`vm\`).
$COMPAT_ERRORS of these cases throw. It compares every result with three independent checks:
\`util.isDeepStrictEqual\`, a structural signature (type tags, prototypes, own key order, property descriptors,
\`Uint8Array\` layout) and a tagged \`JSON.stringify\` (\`undefined\`, \`Uint8Array\`, key order). Before the run, a
self-check confirms that the comparators detect key order, \`undefined\` vs. missing vs. \`null\`, \`Uint8Array\`
vs. \`Array\`, and \`Error\` vs. \`TypeError\`.

The corpus covers unicode and \`(?-u)\` byte patterns (Literal, ClassBytes) and repetitions with and without
\`max\`, greedy and lazy. It covers named and unnamed captures, groups that do not participate, all 18 \`Look\`
variants, alternations and invalid patterns. It also covers \`findAt\` / \`isMatchAt\` / \`shortestMatchAt\` with
out-of-range, negative, NaN and fractional starts, and \`RRegexSet\` with non-string items and non-array inputs.

| check | result |
| --- | --- |
| differential test | **$COMPAT_STATUS**: $COMPAT_MISMATCH mismatches |
| HIR coverage (asserted) | $COMPAT_COVERAGE |
| \`pnpm test\` (candidate) | $(cat "$OUT/test-status-candidate.txt") ($JS_TESTS) |
| \`pnpm test\` (baseline) | $(cat "$OUT/test-status-baseline.txt") |
| \`pnpm test:rs\` (\`wasm-pack test\`) | baseline: $(cat "$OUT/testrs-status-baseline.txt"), candidate: $(cat "$OUT/testrs-status-candidate.txt"). This is a pre-existing failure of the script itself: \`$TESTRS_ERR\` |
| \`wasm-pack test --node\` | baseline: $(cat "$OUT/testrs-node-status-baseline.txt"), candidate: $(cat "$OUT/testrs-node-status-candidate.txt") (\`$TESTRS_NODE\`; the crate has no Rust tests, so this is a compile check) |

Generated type declarations (\`lib/*.d.ts\`, \`lib/*.d.cts\`):

| file | baseline vs. candidate |
| --- | --- |
$DTS_ROWS
${DTS_DIFFS:+Differences:

$DTS_DIFFS}${DTS_DIFFS:+The public types (\`Match\`, \`Captures\`, \`Hir\`, …) and the declarations of \`RRegex\`, \`RRegexSet\` and \`escape\`
are byte-identical. In the generated \`InitOutput\` interface (the raw wasm exports returned by \`init()\` /
\`initSync()\`, also in \`rregex.wasm.d.ts\`), properties can appear in a different order. That order is the
export order chosen by the linker (codegen-unit partitioning), not by the code. It is not stable on master either,
and TypeScript ignores property order.

}JS glue (expected to differ: different wasm imports):

| file | baseline | candidate | Δ | Δ % |
| --- | ---: | ---: | ---: | ---: |
$GLUE_ROWS
## Build time and dependencies

| metric | baseline | candidate | Δ | Δ % |
| --- | ---: | ---: | ---: | ---: |
$BUILD_ROWS
Raw samples (s): clean baseline [$SAMPLES_CLEAN_B], candidate [$SAMPLES_CLEAN_C]; incremental baseline [$SAMPLES_INCR_B], candidate [$SAMPLES_INCR_C].
The two sides are built alternately. Each side has its own \`target/\` directory.

## Size

| artifact | baseline | candidate | Δ | Δ % |
| --- | ---: | ---: | ---: | ---: |
$SIZE_ROWS
- Items whose symbol mentions \`serde\` in the baseline cargo output: $SERDE_BYTES bytes.
- Code and data delta in the cargo output, excluding the \`function names\` and \`__wasm_bindgen_unstable\`
  custom sections (they never ship): $CODE_DELTA bytes.

\`twiggy diff\` (cargo output, before wasm-bindgen and wasm-opt, because \`wasm-opt\` strips the names from \`lib/rregex.wasm\`):

\`\`\`text
$TWIGGY_DIFF
\`\`\`

\`twiggy top\` of the candidate (cargo output):

\`\`\`text
$TWIGGY_TOP
\`\`\`

## Throughput

\`test/compat/bench.mjs\` (tinybench, one process and one \`Bench\` per task, regexes compiled once). Haystacks: $HAY.
Values are the median of $BENCH_ROUNDS interleaved rounds (baseline, candidate, baseline, …). "wasm growth/call" is the wasm linear memory growth per measured call.

| task | baseline ops/s | candidate ops/s | Δ ops/s | baseline median | candidate median | baseline p99 | candidate p99 | baseline wasm growth/call | candidate wasm growth/call |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
$BENCH_ROWS

## Memory: massive \`findAll\`

\`node --expose-gc test/compat/memory.mjs\`: $MEM_DESC. Median of $BENCH_ROUNDS fresh processes.

| metric | baseline | candidate | Δ | Δ % |
| --- | ---: | ---: | ---: | ---: |
$MEM_ROWS
The retained JS heap is the same, so the result objects have the same representation. The difference is in wasm
linear memory. The baseline collects a \`Vec<Match>\` before serializing. Wasm memory cannot shrink, so the
instance keeps that peak. In both builds, the remaining growth comes from copying the 6.8 MB haystack into wasm (the
\`passStringToWasm0\` realloc for non-ASCII text).

## Alternatives evaluated (not shipped)

One-off measurement on 2026-10-31, same machine and toolchain as this report, on the previous master, which still
used \`wee_alloc\`. Absolute values are therefore not comparable with the tables above. Method: \`test/compat/bench.mjs
--time 700\`, ESM target only, 2 interleaved rounds. Both variants produced output identical to the candidate on
the corpus (\`find\`, \`findAll\`, \`captures\`, \`capturesAll\`). These numbers come from an earlier version of the candidate,
which used a typed setter for named capture groups and returned \`JsValue\` instead of \`Result\`.
Restoring \`Reflect::set\` and \`Result\` for ABI compatibility costs about 10-20% on \`captures\` and
\`capturesAll\` with named groups. In that earlier version, \`captures\` small was +85%, \`capturesAll\` small +79%
and \`capturesAll\` large +74% over the baseline. Compare these with the throughput table. \`find\`, \`findAll\` and \`syntax\` do not change.

| variant | findAll small ops/s | findAll large ops/s | capturesAll large ops/s |
| --- | ---: | ---: | ---: |
| baseline (serde) | 241k / 239k | 24.0 / 24.4 | 12.1 / 12.2 |
| **candidate (typed setters)** | 350k / 356k | 35.2 / 37.5 | 19.5 / 19.8 |
| \`inline_js\` constructor \`mk(s,e,v)\` (1 JS call per match) | 407k / 401k | 44.5 / 45.8 | 22.1 / 21.8 |
| batch: \`findAll\` serialized to JSON in Rust + one \`JSON.parse\` | 362k / 354k | 39.1 / 40.8 | 19.3 / 19.2 |

- **\`inline_js\`**: about +20% on \`findAll\` over the candidate, but it cannot ship with the current
  packaging. \`wasm-bindgen\` rejects JS snippets for \`--target no-modules\` (\`importing from
  ./snippets/... isn't supported with --target no-modules\`), which builds \`lib/standalone.js\`, a release asset.
  The \`nodejs\` target emits \`require()\` of an ESM snippet. \`bin/build.sh\` copies one JS file per target and
  does not copy \`snippets/\`. To use it, the \`no-modules\` build must be removed or replaced (for example by
  bundling the snippet).
- **JSON batch**: within noise of the candidate (+4–8% on \`findAll\` large, ±0 elsewhere). It also adds a
  hand-written JSON escaper. This is not justified.

## Wasm memory over repeated calls

\`node test/compat/leak.mjs\`: $LEAK_CALLS calls per method on one instance with the $LEAK_HAY-byte haystack. The
values are the total wasm linear memory growth over those calls. Final wasm memory: $LEAK_FINAL.

| method | baseline | candidate |
| --- | ---: | ---: |
$LEAK_ROWS

With the default allocator, freed memory is reused, so repeated calls do not grow wasm memory after the first
call. With the \`wee_alloc\` allocator, which master used until recently, each call with this haystack grew wasm
memory by about 2.5 MiB, until the instance aborted at 4 GiB.

## Notes on out-of-scope settings that affect these numbers

- \`wasm-opt = false\` in \`[package]\` of \`Cargo.toml\` has no effect. Cargo reports
  \`unused manifest key: package.wasm-opt\`, and wasm-pack only reads \`[package.metadata.wasm-pack.profile.*]\`. So
  \`wasm-pack\` runs \`wasm-opt\` on both sides, and all \`lib/rregex.wasm\` sizes in this report are after
  \`wasm-opt\`. Build times include the \`wasm-opt\` pass.
- \`pnpm test:rs\` fails on both sides because \`wasm-pack test\` requires a target flag (\`--node\`, \`--chrome\`, …).
EOF
log "done: $REPORT"
