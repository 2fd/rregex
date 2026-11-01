//! Builds the plain JS values returned by `RRegex` directly with `js_sys`,
//! without `serde`. The output must stay identical to the previous
//! `serde_wasm_bindgen::to_value` output: same keys, same key order, same
//! value types (`undefined` for `None`, `Uint8Array` for bytes).
use js_sys::{Array, Object, Uint8Array};
use regex_syntax::hir;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

// Note: an `inline_js` constructor (`{ start, end, value }` in one call) is
// not used because JS snippets are not supported by `--target no-modules`
// (`lib/standalone.js`) and `bin/build.sh` ships a single JS file per target.
#[wasm_bindgen]
extern "C" {
    /// A plain JS object with infallible (non-`catch`) property setters.
    /// Typed setters pass numbers and strings straight through the ABI,
    /// without allocating an intermediate `JsValue` for each value.
    #[wasm_bindgen(extends = Object)]
    type Obj;

    #[wasm_bindgen(method, indexing_setter)]
    fn set(this: &Obj, key: &JsValue, value: &JsValue);

    #[wasm_bindgen(method, indexing_setter)]
    fn set_str(this: &Obj, key: &JsValue, value: &str);

    #[wasm_bindgen(method, indexing_setter)]
    fn set_num(this: &Obj, key: &JsValue, value: f64);

    #[wasm_bindgen(method, indexing_setter)]
    fn set_bool(this: &Obj, key: &JsValue, value: bool);
}

impl Obj {
    fn new() -> Obj {
        Object::new().unchecked_into()
    }
}

/// JS strings for the static keys and values of `Match`, `Captures` and HIR
/// objects, created once per thread so each property write is a single JS call.
struct Keys {
    type_: JsValue,
    name: JsValue,
    variant: JsValue,
    values: JsValue,
    struct_: JsValue,
    enum_: JsValue,
    kind: JsValue,
    ranges: JsValue,
    start: JsValue,
    end: JsValue,
    len: JsValue,
    min: JsValue,
    max: JsValue,
    greedy: JsValue,
    sub: JsValue,
    index: JsValue,
    get: JsValue,
    plain_name: JsValue,
    value: JsValue,
}

impl Keys {
    fn new() -> Keys {
        Keys {
            type_: "@type".into(),
            name: "@name".into(),
            variant: "@variant".into(),
            values: "@values".into(),
            struct_: "struct".into(),
            enum_: "enum".into(),
            kind: "kind".into(),
            ranges: "ranges".into(),
            start: "start".into(),
            end: "end".into(),
            len: "len".into(),
            min: "min".into(),
            max: "max".into(),
            greedy: "greedy".into(),
            sub: "sub".into(),
            index: "index".into(),
            get: "get".into(),
            plain_name: "name".into(),
            value: "value".into(),
        }
    }
}

thread_local! {
    static KEYS: Keys = Keys::new();
}

/// Starts an object with the `@type` and `@name` header shared by every HIR node.
fn node(k: &Keys, type_: &JsValue, name: &str) -> Obj {
    let o = Obj::new();
    o.set(&k.type_, type_);
    o.set_str(&k.name, name);
    o
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

pub struct Match<'t>(regex::Match<'t>);

impl<'t> From<regex::Match<'t>> for Match<'t> {
    fn from(value: regex::Match<'t>) -> Self {
        Match(value)
    }
}

impl<'t> From<Match<'t>> for JsValue {
    fn from(value: Match<'t>) -> Self {
        let m = value.0;
        let o = Obj::new();
        KEYS.with(|k| {
            o.set_num(&k.start, m.start() as f64);
            o.set_num(&k.end, m.end() as f64);
            o.set_str(&k.value, m.as_str());
        });
        o.into()
    }
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

impl<'t> Match<'t> {
    /// Named groups are set with `Reflect::set` (a `catch` import), as before:
    /// the wasm exports it pulls in (`__wbindgen_exn_store`, …) are part of the
    /// `InitOutput` type in the generated `.d.ts`.
    pub fn captures(
        captures: regex::Captures,
        captures_names: regex::CaptureNames,
    ) -> Result<JsValue, JsValue> {
        let matches = Array::new();
        let names = Obj::new();
        for (index, name) in captures_names.enumerate() {
            if let Some(m) = captures.get(index) {
                matches.push(&JsValue::from(Match::from(m)));
            }

            if let Some(n) = name {
                if let Some(m) = captures.name(n) {
                    js_sys::Reflect::set(&names, &JsValue::from_str(n), &JsValue::from(Match::from(m)))?;
                }
            }
        }

        let result = Obj::new();
        KEYS.with(|k| {
            result.set(&k.get, &matches);
            result.set(&k.plain_name, &names);
        });
        Ok(result.into())
    }
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
        KEYS.with(|k| value.to_js(k))
    }
}

/// Builds the JS representation of a HIR node.
trait ToJs {
    fn to_js(&self, k: &Keys) -> JsValue;
}

/// Returns `[value]`, the `@values` payload of single-value enum variants.
fn values1(k: &Keys, value: &dyn ToJs) -> Array {
    Array::of1(&value.to_js(k))
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
    fn to_js(&self, k: &Keys) -> JsValue {
        let o = node(k, &k.struct_, "regex_syntax::hir::Hir");
        o.set(&k.kind, &Hir(self.0.kind()).to_js(k));
        o.into()
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

fn hir_list(k: &Keys, list: &[hir::Hir]) -> Array {
    let values = Array::new();
    for h in list {
        values.push(&Hir(h).to_js(k));
    }
    Array::of1(&values)
}

impl ToJs for Hir<&hir::HirKind> {
    fn to_js(&self, k: &Keys) -> JsValue {
        let o = node(k, &k.enum_, "regex_syntax::hir::HirKind");
        let (variant, values) = match self.0 {
            hir::HirKind::Empty => ("Empty", None),
            hir::HirKind::Literal(l) => ("Literal", Some(values1(k, &Hir(l)))),
            hir::HirKind::Class(c) => ("Class", Some(values1(k, &Hir(c)))),
            hir::HirKind::Look(l) => ("Look", Some(values1(k, &Hir(l)))),
            hir::HirKind::Repetition(r) => ("Repetition", Some(values1(k, &Hir(r)))),
            hir::HirKind::Capture(c) => ("Capture", Some(values1(k, &Hir(c)))),
            hir::HirKind::Concat(c) => ("Concat", Some(hir_list(k, c))),
            hir::HirKind::Alternation(a) => ("Alternation", Some(hir_list(k, a))),
        };
        o.set_str(&k.variant, variant);
        if let Some(values) = values {
            o.set(&k.values, &values);
        }
        o.into()
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
    fn to_js(&self, k: &Keys) -> JsValue {
        let o = node(k, &k.struct_, "regex_syntax::hir::Literal");
        let bytes = Uint8Array::from(self.0 .0.as_ref());
        o.set(&k.values, &Array::of1(&bytes));
        o.into()
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
    fn to_js(&self, k: &Keys) -> JsValue {
        let o = node(k, &k.enum_, "regex_syntax::hir::Class");
        let (variant, values) = match self.0 {
            hir::Class::Bytes(b) => ("Bytes", values1(k, &Hir(b))),
            hir::Class::Unicode(u) => ("Unicode", values1(k, &Hir(u))),
        };
        o.set_str(&k.variant, variant);
        o.set(&k.values, &values);
        o.into()
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
    fn to_js(&self, k: &Keys) -> JsValue {
        let o = node(k, &k.struct_, "regex_syntax::hir::ClassUnicode");
        let ranges = Array::new();
        for r in self.0.ranges() {
            ranges.push(&Hir(r).to_js(k));
        }
        o.set(&k.ranges, &ranges);
        o.into()
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

impl ToJs for Hir<&hir::ClassUnicodeRange> {
    fn to_js(&self, k: &Keys) -> JsValue {
        let o = node(k, &k.struct_, "regex_syntax::hir::ClassUnicodeRange");
        let mut buf = [0u8; 4];
        o.set_str(&k.start, self.0.start().encode_utf8(&mut buf));
        o.set_str(&k.end, self.0.end().encode_utf8(&mut buf));
        o.set_num(&k.len, self.0.len() as f64);
        o.into()
    }
}

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
    fn to_js(&self, k: &Keys) -> JsValue {
        let o = node(k, &k.struct_, "regex_syntax::hir::ClassBytes");
        let ranges = Array::new();
        for r in self.0.ranges() {
            ranges.push(&Hir(r).to_js(k));
        }
        o.set(&k.ranges, &ranges);
        o.into()
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

impl ToJs for Hir<&hir::ClassBytesRange> {
    fn to_js(&self, k: &Keys) -> JsValue {
        let o = node(k, &k.struct_, "regex_syntax::hir::ClassBytesRange");
        o.set_num(&k.start, self.0.start() as f64);
        o.set_num(&k.end, self.0.end() as f64);
        o.set_num(&k.len, self.0.len() as f64);
        o.into()
    }
}

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
    fn to_js(&self, k: &Keys) -> JsValue {
        let o = node(k, &k.enum_, "regex_syntax::hir::Look");
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
        o.set_str(&k.variant, variant);
        o.into()
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
    fn to_js(&self, k: &Keys) -> JsValue {
        let o = node(k, &k.struct_, "regex_syntax::hir::Repetition");
        o.set_num(&k.min, self.0.min as f64);
        match self.0.max {
            Some(max) => o.set_num(&k.max, max as f64),
            None => o.set(&k.max, &JsValue::UNDEFINED),
        }
        o.set_bool(&k.greedy, self.0.greedy);
        o.set(&k.sub, &Hir(self.0.sub.as_ref()).to_js(k));
        o.into()
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
    fn to_js(&self, k: &Keys) -> JsValue {
        let o = node(k, &k.struct_, "regex_syntax::hir::Capture");
        o.set_num(&k.index, self.0.index as f64);
        match &self.0.name {
            Some(name) => o.set_str(&k.plain_name, name),
            None => o.set(&k.plain_name, &JsValue::UNDEFINED),
        }
        o.set(&k.sub, &Hir(self.0.sub.as_ref()).to_js(k));
        o.into()
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
    capture_type!(),
);
