//! Builds the plain JS values returned by `RRegex` directly, without `serde`.
//! The output must stay identical to the previous
//! `serde_wasm_bindgen::to_value` output: same keys, same key order, same
//! value types (`undefined` for `None`, `Uint8Array` for bytes).
//!
//! Each object is created by one call to a JS function that returns an object
//! literal, instead of one call per property. The literal gives every object
//! of a kind the same shape, and static keys and values (`@type`, `@name`)
//! never cross the wasm boundary.
use regex_syntax::hir;
use wasm_bindgen::prelude::*;

// `inline_js` is emitted by wasm-bindgen as a snippet module next to the glue
// (`js/wasm/snippets/`), and tsdown bundles it into every `lib/` entry point.
// It adds wasm imports only: the exports (`InitOutput`) do not change.
#[wasm_bindgen(inline_js = r#"
export function match_(start, end, value) {
  return { start, end, value };
}
export function push_match(list, start, end, value) {
  list.push({ start, end, value });
}
export function set_match(names, key, start, end, value) {
  names[key] = { start, end, value };
}
export function captures(get, name) {
  return { get, name };
}
export function array() {
  return [];
}
export function object() {
  return {};
}
export function push(list, value) {
  list.push(value);
}
export function hir(kind) {
  return { '@type': 'struct', '@name': 'regex_syntax::hir::Hir', kind };
}
export function hir_kind_empty() {
  return { '@type': 'enum', '@name': 'regex_syntax::hir::HirKind', '@variant': 'Empty' };
}
export function hir_kind(variant, value) {
  return { '@type': 'enum', '@name': 'regex_syntax::hir::HirKind', '@variant': variant, '@values': [value] };
}
export function literal(bytes) {
  return { '@type': 'struct', '@name': 'regex_syntax::hir::Literal', '@values': [bytes.slice()] };
}
export function class_(variant, value) {
  return { '@type': 'enum', '@name': 'regex_syntax::hir::Class', '@variant': variant, '@values': [value] };
}
export function class_unicode(flat) {
  const ranges = [];
  for (let i = 0; i < flat.length; i += 3) {
    ranges.push({
      '@type': 'struct',
      '@name': 'regex_syntax::hir::ClassUnicodeRange',
      start: String.fromCodePoint(flat[i]),
      end: String.fromCodePoint(flat[i + 1]),
      len: flat[i + 2],
    });
  }
  return { '@type': 'struct', '@name': 'regex_syntax::hir::ClassUnicode', ranges };
}
export function class_bytes(flat) {
  const ranges = [];
  for (let i = 0; i < flat.length; i += 3) {
    ranges.push({
      '@type': 'struct',
      '@name': 'regex_syntax::hir::ClassBytesRange',
      start: flat[i],
      end: flat[i + 1],
      len: flat[i + 2],
    });
  }
  return { '@type': 'struct', '@name': 'regex_syntax::hir::ClassBytes', ranges };
}
export function look(variant) {
  return { '@type': 'enum', '@name': 'regex_syntax::hir::Look', '@variant': variant };
}
export function repetition(min, max, greedy, sub) {
  return { '@type': 'struct', '@name': 'regex_syntax::hir::Repetition', min, max, greedy, sub };
}
export function capture(index, name, sub) {
  return { '@type': 'struct', '@name': 'regex_syntax::hir::Capture', index, name, sub };
}
"#)]
extern "C" {
    /// `{ start, end, value }`
    fn match_(start: u32, end: u32, value: &str) -> JsValue;
    /// `list.push({ start, end, value })`
    fn push_match(list: &JsValue, start: u32, end: u32, value: &str);
    /// `names[key] = { start, end, value }`: an ordinary property assignment,
    /// the same `[[Set]]` as the previous `Reflect.set` on a plain object.
    fn set_match(names: &JsValue, key: &JsValue, start: u32, end: u32, value: &str);
    /// `{ get, name }`
    fn captures(get: &JsValue, name: &JsValue) -> JsValue;
    pub(crate) fn array() -> JsValue;
    fn object() -> JsValue;
    pub(crate) fn push(list: &JsValue, value: &JsValue);

    fn hir(kind: &JsValue) -> JsValue;
    fn hir_kind_empty() -> JsValue;
    fn hir_kind(variant: &str, value: &JsValue) -> JsValue;
    /// Copies `bytes`: the view into wasm memory is only valid during the call.
    fn literal(bytes: &[u8]) -> JsValue;
    fn class_(variant: &str, value: &JsValue) -> JsValue;
    /// `flat` is `[start, end, len, …]`, with code points as `start` and `end`.
    fn class_unicode(flat: &[u32]) -> JsValue;
    /// `flat` is `[start, end, len, …]`.
    fn class_bytes(flat: &[u32]) -> JsValue;
    fn look(variant: &str) -> JsValue;
    fn repetition(min: u32, max: Option<u32>, greedy: bool, sub: &JsValue) -> JsValue;
    fn capture(index: u32, name: Option<&str>, sub: &JsValue) -> JsValue;
}

macro_rules! match_type {
    () => {
r#"/**
 * Represents a single match of a regex in a haystack.
 *
 * A `Match` contains both the start and end byte offsets of the match and the
 * actual substring corresponding to the range of those byte offsets. It is
 * guaranteed that `start <= end`. When `start == end`, the match is empty.
 *
 * Since this `Match` can only be produced by the top-level `Regex` APIs
 * that only support searching UTF-8 encoded strings, the byte offsets for a
 * `Match` are guaranteed to fall on valid UTF-8 codepoint boundaries. That
 * is, slicing an `Uint8Array` created with a TextEncoder is guaranteed to never
 * be out of range.
 *
 * # Numbering
 *
 * The byte offsets in a `Match` form a half-open interval. That is, the
 * start of the range is inclusive and the end of the range is exclusive.
 * For example, given a haystack `abcFOOxyz` and a match of `FOO`, its byte
 * offset range starts at `3` and ends at `6`. `3` corresponds to `F` and
 * `6` corresponds to `x`, which is one past the end of the match. This
 * corresponds to the same kind of slicing that Rust uses.
 *
 * For more on why this was chosen over other schemes (aside from being
 * consistent with how Rust the language works), see [this discussion] and
 * [Dijkstra's note on a related topic][note].
 *
 * [this discussion]: https://github.com/rust-lang/regex/discussions/866
 * [note]: https://www.cs.utexas.edu/users/EWD/transcriptions/EWD08xx/EWD831.html
 *
 * # Example
 *
 * This example shows the value of each of the methods on `Match` for a
 * particular search.
 *
 * ```typescript
 * import { RRegex } from "rregex"
 *
 * const re = new RRegex("\\p{Greek}+");
 * const hay = "Greek: αβγδ";
 * const m = re.find(hay);
 * expect(m.start).toBe(7);
 * expect(m.end).toBe(15);
 * expect(m.value).toBe("αβγδ");
 * ```
 *
 * @see  @see https://docs.rs/regex/latest/regex/
 */
export type Match = {
  start: number
  end: number
  value: string
}"#
    };
}

// Offsets are `u32`: `usize` is 32 bits on wasm32, so no value is truncated.

/// Returns the `Match` object of `m`.
pub fn match_to_js(m: regex::Match) -> JsValue {
    match_(m.start() as u32, m.end() as u32, m.as_str())
}

/// Pushes the `Match` object of `m` to the JS array `list`.
pub fn push_match_to_js(list: &JsValue, m: regex::Match) {
    push_match(list, m.start() as u32, m.end() as u32, m.as_str());
}

macro_rules! captures_type {
    () => {
r#"/**
 * Represents the capture groups for a single match.
 *
 * Capture groups refer to parts of a regex enclosed in parentheses. They can
 * be optionally named. The purpose of capture groups is to be able to
 * reference different parts of a match based on the original pattern. For
 * example, say you want to match the individual letters in a 5-letter word:
 *
 * ```text
 * (?<first>\w)(\w)(?:\w)\w(?<last>\w)
 * ```
 *
 * This regex has 4 capture groups:
 *
 * * The group at index `0` corresponds to the overall match. It is always
 * present in every match and never has a name.
 * * The group at index `1` with name `first` corresponding to the first
 * letter.
 * * The group at index `2` with no name corresponding to the second letter.
 * * The group at index `3` with name `last` corresponding to the fifth and
 * last letter.
 *
 * Notice that `(?:\w)` was not listed above as a capture group despite it
 * being enclosed in parentheses. That's because `(?:pattern)` is a special
 * syntax that permits grouping but *without* capturing. The reason for not
 * treating it as a capture is that tracking and reporting capture groups
 * requires additional state that may lead to slower searches. So using as few
 * capture groups as possible can help performance. (Although the difference
 * in performance of a couple of capture groups is likely immaterial.)
 *
 * # Example
 *
 * ```typescript
 * import { RRegex } from "rregex"
 *
 * const re = new RRegex("(?<first>\\w)(\\w)(?:\\w)\\w(?<last>\\w)");
 * const caps = re.captures("toady");
 * expect(caps.get[0].value).toBe("toady");
 * expect(caps.name["first"].value).toBe("t");
 * expect(caps.get[2].value).toBe("o");
 * expect(caps.name["last"].value).toBe("y");
 * ```
 */
export type Captures = {
  get: Match[]
  name: Record<string, Match>
}"#
    };
}

/// The capture group names of a regex as JS strings (`None` for unnamed
/// groups), created once per search instead of once per match.
pub fn capture_names_to_js(names: regex::CaptureNames) -> Vec<Option<JsValue>> {
    names.map(|name| name.map(JsValue::from_str)).collect()
}

/// Returns the `Captures` object of the last match in `locs`.
///
/// Groups that did not participate in the match are left out of `get`, so an
/// index in `get` is not always the group index (as before).
pub fn captures_to_js(
    text: &str,
    locs: &regex::CaptureLocations,
    names: &[Option<JsValue>],
) -> JsValue {
    let get = array();
    let by_name = object();
    for (index, name) in names.iter().enumerate() {
        if let Some((start, end)) = locs.get(index) {
            let value = &text[start..end];
            push_match(&get, start as u32, end as u32, value);
            if let Some(name) = name {
                set_match(&by_name, name, start as u32, end as u32, value);
            }
        }
    }
    captures(&get, &by_name)
}

/// Wraps a borrowed `regex_syntax` value to convert it into a JS value.
pub struct Hir<T>(T);

impl<T> From<T> for Hir<T> {
    fn from(value: T) -> Self {
        Hir(value)
    }
}

impl From<Hir<&hir::Hir>> for JsValue {
    fn from(value: Hir<&hir::Hir>) -> Self {
        value.to_js()
    }
}

/// Builds the JS representation of a HIR node.
trait ToJs {
    fn to_js(&self) -> JsValue;
}

macro_rules! hir_type {
    () => {
r#"/**
 * A high-level intermediate representation (HIR) for a regular expression.
 */
export type Hir = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Hir'
  kind: HirKind
}"#
    };
}

impl ToJs for Hir<&hir::Hir> {
    fn to_js(&self) -> JsValue {
        hir(&Hir(self.0.kind()).to_js())
    }
}

macro_rules! hirkind_type {
    () => {
r#"/**
 * The underlying kind of an arbitrary `Hir` expression.
 *
 * An `HirKind` is principally useful for doing case analysis on the type of a
 * regular expression. If you're looking to build new `Hir` values, then you must
 * use the smart constructors defined on `Hir`, like `Hir::repetition`, to build
 * new `Hir` values. The API intentionally does not expose any way of building an
 * `Hir` directly from an `HirKind`.
 */
export type HirKind =
  | HirKindEmptyVariant
  | HirKindLiteralVariant
  | HirKindClassVariant
  | HirKindLookVariant
  | HirKindRepetitionVariant
  | HirKindCaptureVariant
  | HirKindConcatVariant
  | HirKindAlternationVariant

/**
 * The empty regular expression, which matches everything, including the empty string.
 */
export type HirKindEmptyVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Empty'
}

/**
 * A literal string that matches exactly these bytes.
 */
export type HirKindLiteralVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Literal'
  '@values': [Literal]
}

/**
 * A single character class that matches any of the characters in the class.
 * A class can either consist of Unicode scalar values as characters, or it can
 * use bytes.
 *
 * A class may be empty. In which case, it matches nothing.
 */
export type HirKindClassVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Class'
  '@values': [Class]
}

/**
 * A look-around assertion. A look-around match always has zero length.
 */
export type HirKindLookVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Look'
  '@values': [Look]
}

/**
 * A repetition operation applied to a sub-expression.
 */
export type HirKindRepetitionVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Repetition'
  '@values': [Repetition]
}

/**
 * A capturing group, which contains a sub-expression.
 */
export type HirKindCaptureVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Capture'
  '@values': [Capture]
}

/**
 * A concatenation of expressions.
 *
 * A concatenation matches only if each of its sub-expressions match one after
 * the other.
 *
 * Concatenations are guaranteed by `Hir`'s smart constructors to always have at
 * least two sub-expressions.
 */
export type HirKindConcatVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Concat'
  '@values': [Hir[]]
}

/**
 * An alternation of expressions.
 *
 * An alternation matches only if at least one of its sub-expressions match.
 * If multiple sub-expressions match, then the leftmost is preferred.
 *
 * Alternations are guaranteed by `Hir`'s smart constructors to always have at
 * least two sub-expressions.
 */
export type HirKindAlternationVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Alternation'
  '@values': [Hir[]]
}"#
    };
}

/// Returns the JS array of the HIR nodes in `list`.
fn hir_list(list: &[hir::Hir]) -> JsValue {
    let values = array();
    for h in list {
        push(&values, &Hir(h).to_js());
    }
    values
}

impl ToJs for Hir<&hir::HirKind> {
    fn to_js(&self) -> JsValue {
        let (variant, value) = match self.0 {
            hir::HirKind::Empty => return hir_kind_empty(),
            hir::HirKind::Literal(l) => ("Literal", Hir(l).to_js()),
            hir::HirKind::Class(c) => ("Class", Hir(c).to_js()),
            hir::HirKind::Look(l) => ("Look", Hir(l).to_js()),
            hir::HirKind::Repetition(r) => ("Repetition", Hir(r).to_js()),
            hir::HirKind::Capture(c) => ("Capture", Hir(c).to_js()),
            hir::HirKind::Concat(c) => ("Concat", hir_list(c)),
            hir::HirKind::Alternation(a) => ("Alternation", hir_list(a)),
        };
        hir_kind(variant, &value)
    }
}

macro_rules! literal_type {
    () => {
r#"/**
 * The high-level intermediate representation of a literal.
 *
 * A literal corresponds to 0 or more bytes that should be matched literally.
 * The smart constructors defined on `Hir` will automatically concatenate adjacent
 * literals into one literal, and will even automatically replace empty literals
 * with `HirKind::Empty`.
 */
export type Literal = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Literal'
  '@values': [Uint8Array]
}"#
    };
}

impl ToJs for Hir<&hir::Literal> {
    fn to_js(&self) -> JsValue {
        literal(self.0 .0.as_ref())
    }
}

macro_rules! class_type {
    () => {
r#"/**
 * The high-level intermediate representation of a character class.
 *
 * A character class corresponds to a set of characters. A character is either
 * defined by a Unicode scalar value or a byte. Unicode characters are used by
 * default, while bytes are used when Unicode mode (via the `u` flag) is disabled.
 *
 * A character class, regardless of its character type, is represented by a
 * sequence of non-overlapping non-adjacent ranges of characters.
 *
 * Note that `Bytes` variant may be produced even when it exclusively matches
 * valid UTF-8. This is because a `Bytes` variant represents an intention by the
 * author of the regular expression to disable Unicode mode, which in turn
 * impacts the semantics of case insensitive matching. For example, `(?i)k` and
 * `(?i-u)k` will not match the same set of strings.
 */
export type Class =
  | ClassUnicodeVariant
  | ClassByteVariant

/**
 * A set of characters represented by Unicode scalar values.
 */
export type ClassUnicodeVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::Class'
  '@variant': 'Unicode'
  '@values': [ClassUnicode]
}

/**
 * A set of characters represented by arbitrary bytes (one byte per character).
 */
export type ClassByteVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::Class'
  '@variant': 'Bytes'
  '@values': [ClassBytes]
}"#
    };
}

impl ToJs for Hir<&hir::Class> {
    fn to_js(&self) -> JsValue {
        match self.0 {
            hir::Class::Bytes(b) => class_("Bytes", &Hir(b).to_js()),
            hir::Class::Unicode(u) => class_("Unicode", &Hir(u).to_js()),
        }
    }
}

macro_rules! classunicode_type {
    () => {
r#"/**
 * A set of characters represented by Unicode scalar values.
 */
export type ClassUnicode = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::ClassUnicode'

  /** The underlying ranges as a slice. */
  ranges: ClassUnicodeRange[]
}"#
    };
}

impl ToJs for Hir<&hir::ClassUnicode> {
    /// All ranges cross the boundary in one `[start, end, len, …]` slice.
    fn to_js(&self) -> JsValue {
        let mut flat = Vec::with_capacity(self.0.ranges().len() * 3);
        for r in self.0.ranges() {
            flat.extend_from_slice(&[u32::from(r.start()), u32::from(r.end()), r.len() as u32]);
        }
        class_unicode(&flat)
    }
}

macro_rules! classunicoderange_type {
    () => {
r#"/**
 * A single range of characters represented by Unicode scalar values.
 *
 * The range is closed. That is, the start and end of the range are included in
 * the range.
 */
export type ClassUnicodeRange = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::ClassUnicodeRange'

  /**
   * Return the start of this range.
   *
   * The start of a range is always less than or equal to the end of the range.
   */
  start: string

  /**
   * Return the end of this range.
   *
   * The end of a range is always greater than or equal to the start of the range.
   */
  end: string

  /**
   * The number of codepoints in this range.
   */
  len: number
}"#
    };
}

// `ClassUnicodeRange` objects are built by `class_unicode` in JS: `start` and
// `end` are `String.fromCodePoint` of the range bounds.

macro_rules! classbytes_type {
    () => {
r#"/**
 * A set of characters represented by arbitrary bytes (where one byte corresponds
 * to one character).
 */
export type ClassBytes = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::ClassBytes'

  /** The underlying ranges as a slice. */
  ranges: ClassBytesRange[]
}"#
    };
}

impl ToJs for Hir<&hir::ClassBytes> {
    /// All ranges cross the boundary in one `[start, end, len, …]` slice.
    fn to_js(&self) -> JsValue {
        let mut flat = Vec::with_capacity(self.0.ranges().len() * 3);
        for r in self.0.ranges() {
            flat.extend_from_slice(&[u32::from(r.start()), u32::from(r.end()), r.len() as u32]);
        }
        class_bytes(&flat)
    }
}

macro_rules! classbytesrange_type {
    () => {
r#"/**
 * A single range of characters represented by arbitrary bytes.
 *
 * The range is closed. That is, the start and end of the range are included in
 * the range.
 */
export type ClassBytesRange = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::ClassBytesRange'

  /**
   * The start of this range.
   *
   * The start of a range is always less than or equal to the end of the range.
   */
  start: number

  /**
   * The end of this range.
   *
   * The end of a range is always greater than or equal to the start of the range.
   */
  end: number

  /**
   * The number of bytes in this range.
   */
  len: number
}"#
    };
}

// `ClassBytesRange` objects are built by `class_bytes` in JS.

macro_rules! look_type {
    () => {
r#" /**
 * The high-level intermediate representation for a look-around assertion.
 *
 * An assertion match is always zero-length. Also called an “empty match.”
 */
export type Look =
  | LookStartVariant
  | LookEndVariant
  | LookStartLFVariant
  | LookEndLFVariant
  | LookStartCRLFVariant
  | LookEndCRLFVariant
  | LookWordAsciiVariant
  | LookWordAsciiNegateVariant
  | LookWordUnicodeVariant
  | LookWordUnicodeNegateVariant
  | LookWordStartAsciiVariant
  | LookWordEndAsciiVariant
  | LookWordStartUnicodeVariant
  | LookWordEndUnicodeVariant
  | LookWordStartHalfAsciiVariant
  | LookWordEndHalfAsciiVariant
  | LookWordStartHalfUnicodeVariant
  | LookWordEndHalfUnicodeVariant

/**
 * Match the beginning of text. Specifically, this matches at the starting
 * position of the input.
 */
export type LookStartVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'Start'
}

/**
 * Match the end of text. Specifically, this matches at the ending position of
 * the input.
 */
export type LookEndVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'End'
}

/**
 * Match the beginning of a line or the beginning of text. Specifically, this
 * matches at the starting position of the input, or at the position immediately
 * following a `\n` character.
 */
export type LookStartLFVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'StartLF'
}

/**
 * Match the end of a line or the end of text. Specifically, this matches at the
 * end position of the input, or at the position immediately preceding a `\n`
 * character.
 */
export type LookEndLFVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'EndLF'
}

/**
 * Match the beginning of a line or the beginning of text. Specifically, this
 * matches at the starting position of the input, or at the position immediately
 * following either a `\r` or `\n` character, but never after a `\r` when a `\n`
 * follows.
 */
export type LookStartCRLFVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'StartCRLF'
}

/**
 * Match the end of a line or the end of text. Specifically, this matches at the
 * end position of the input, or at the position immediately preceding a `\r` or
 * `\n` character, but never before a `\n` when a `\r` precedes it.
 */
export type LookEndCRLFVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'EndCRLF'
}

/**
 * Match an ASCII-only word boundary. That is, this matches a position where the
 * left adjacent character and right adjacent character correspond to a word and
 * non-word or a non-word and word character.
 */
export type LookWordAsciiVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'WordAscii'
}

/**
 * Match an ASCII-only negation of a word boundary.
 */
export type LookWordAsciiNegateVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'WordAsciiNegate'
}

/**
 * Match a Unicode-aware word boundary. That is, this matches a position where
 * the left adjacent character and right adjacent character correspond to a word
 * and non-word or a non-word and word character.
 */
export type LookWordUnicodeVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'WordUnicode'
}

/**
 * Match a Unicode-aware negation of a word boundary.
 */
export type LookWordUnicodeNegateVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'WordUnicodeNegate'
}

/**
 * Match the start of an ASCII-only word boundary. That is, this matches a
 * position at either the beginning of the haystack or where the previous
 * character is not a word character and the following character is a word
 * character.
 */
export type LookWordStartAsciiVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'WordStartAscii'
}

/**
 * Match the end of an ASCII-only word boundary. That is, this matches a
 * position at either the end of the haystack orwhere the previous character is
 * a word character and the following character is not a word character.
 */
export type LookWordEndAsciiVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'WordEndAscii'
}

/**
 * Match the start of a Unicode word boundary. That is, this matches a position
 * at either the beginning of the haystack or where the previous character is
 * not a word character and the following character is a word character.
 */
export type LookWordStartUnicodeVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'WordStartUnicode'
}

/**
 * Match the end of a Unicode word boundary. That is, this matches a position at
 *  either the end of the haystack or where the previous character is a word
 * character and the following character is not a word character.
 */
export type LookWordEndUnicodeVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'WordEndUnicode'
}

/**
 * Match the start half of an ASCII-only word boundary. That is, this matches a
 * position at either the beginning of the haystack or where the previous
 * character is not a word character.
 */
export type LookWordStartHalfAsciiVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::Look',
  '@variant': 'WordStartHalfAscii'
}

/**
 * Match the end half of an ASCII-only word boundary. That is, this matches a
 * position at either the end of the haystack or where the following character
 * is not a word character.
 */
export type LookWordEndHalfAsciiVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::Look',
  '@variant': 'WordEndHalfAscii'
}

/**
 * Match the start half of a Unicode word boundary. That is, this matches a
 * position at either the beginning of the haystack or where the previous
 * character is not a word character.
 */
export type LookWordStartHalfUnicodeVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::Look',
  '@variant': 'WordStartHalfUnicode'
}

/**
 * Match the end half of a Unicode word boundary. That is, this matches a
 * position at either the end of the haystack or where the following character
 * is not a word character.
 */
export type LookWordEndHalfUnicodeVariant = {
  '@type': 'enum'
  '@name': 'regex_syntax::hir::Look',
  '@variant': 'WordEndHalfUnicode'
}"#
    };
}

impl ToJs for Hir<&hir::Look> {
    fn to_js(&self) -> JsValue {
        let variant = match self.0 {
            hir::Look::Start => "Start",
            hir::Look::End => "End",
            hir::Look::StartLF => "StartLF",
            hir::Look::EndLF => "EndLF",
            hir::Look::StartCRLF => "StartCRLF",
            hir::Look::EndCRLF => "EndCRLF",
            hir::Look::WordAscii => "WordAscii",
            hir::Look::WordAsciiNegate => "WordAsciiNegate",
            hir::Look::WordUnicode => "WordUnicode",
            hir::Look::WordUnicodeNegate => "WordUnicodeNegate",
            hir::Look::WordStartAscii => "WordStartAscii",
            hir::Look::WordEndAscii => "WordEndAscii",
            hir::Look::WordStartUnicode => "WordStartUnicode",
            hir::Look::WordEndUnicode => "WordEndUnicode",
            hir::Look::WordStartHalfAscii => "WordStartHalfAscii",
            hir::Look::WordEndHalfAscii => "WordEndHalfAscii",
            hir::Look::WordStartHalfUnicode => "WordStartHalfUnicode",
            hir::Look::WordEndHalfUnicode => "WordEndHalfUnicode",
        };
        look(variant)
    }
}

macro_rules! repetition_type {
    () => {
r#"/**
 * The high-level intermediate representation of a repetition operator.
 *
 * A repetition operator permits the repetition of an arbitrary sub-expression
 */
export type Repetition = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Repetition'

  /**
   * The minimum range of the repetition.
   *
   * Note that special cases like `?`, `+` and `*` all get translated into the
   * ranges `{0,1}`, `{1,}` and `{0,}`, respectively.
   *
   * When `min` is zero, this expression can match the empty string regardless
   * of what its sub-expression is.
   */
  min: number

  /**
   * The maximum range of the repetition.
   *
   * Note that when `max` is `undefined`, `min` acts as a lower bound but where
   * there is no upper bound. For something like `x{5}` where the min and max
   * are equivalent, `min` will be set to `5` and `max` will be set to `5`.
   */
  max?: number

  /**
   * Whether this repetition operator is greedy or not. A greedy operator will
   * match as much as it can. A non-greedy operator will match as little as it
   * can.
   *
   * Typically, operators are greedy by default and are only non-greedy when a
   * `?` suffix is used, e.g., `(expr)*` is greedy while `(expr)*?` is not.
   * However, this can be inverted via the `U` “ungreedy” flag.
   */
  greedy: boolean

  /**
   * The expression being repeated.
   */
  sub: Hir
}"#
    };
}

impl ToJs for Hir<&hir::Repetition> {
    fn to_js(&self) -> JsValue {
        let r = self.0;
        repetition(r.min, r.max, r.greedy, &Hir(r.sub.as_ref()).to_js())
    }
}

macro_rules! capture_type {
    () => {
r#"/**
 * The high-level intermediate representation for a capturing group.
 *
 * A capturing group always has an index and a child expression. It may also
 * have a name associated with it (e.g., `(?P<foo>\w)`), but it's not necessary.
 *
 * Note that there is no explicit representation of a non-capturing group in a
 * `Hir`. Instead, non-capturing grouping is handled automatically by the
 * recursive structure of the `Hir` itself.
 */
export type Capture = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Capture'

  /** The capture index of the capture. */
  index: number

  /** The name of the capture, if it exists. */
  name?: String

  /** The expression inside the capturing group, which may be empty. */
  sub: Hir
}"#
    };
}

impl ToJs for Hir<&hir::Capture> {
    fn to_js(&self) -> JsValue {
        let c = self.0;
        capture(c.index, c.name.as_deref(), &Hir(c.sub.as_ref()).to_js())
    }
}

// `wasm-bindgen` appends one block per `typescript_custom_section` in the order
// it finds them in the linked wasm. That order is not the source order, and
// unrelated code changes can change it. A single section keeps the published
// `.d.ts` stable. The order below is the order of the published `.d.ts`.
#[wasm_bindgen(typescript_custom_section)]
const TYPES: &'static str = concat!(
    match_type!(), "\n\n",
    hir_type!(), "\n\n",
    hirkind_type!(), "\n\n",
    literal_type!(), "\n\n",
    class_type!(), "\n\n",
    classunicode_type!(), "\n\n",
    classunicoderange_type!(), "\n\n",
    classbytes_type!(), "\n\n",
    classbytesrange_type!(), "\n\n",
    look_type!(), "\n\n",
    repetition_type!(), "\n\n",
    captures_type!(), "\n\n",
    capture_type!(), "\n\n",
    crate::options::options_type!(),
);
