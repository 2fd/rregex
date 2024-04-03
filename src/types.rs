use regex_syntax::hir;
use serde::ser::SerializeStruct;
use serde::Serialize;
use std::convert::TryFrom;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const MATCH_TYPE: &'static str = r#"/**
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
}"#;

pub struct Match<'t>(regex::Match<'t>);

impl<'t> From<regex::Match<'t>> for Match<'t> {
    fn from(value: regex::Match<'t>) -> Self {
        Match(value)
    }
}

impl<'t> TryFrom<Match<'t>> for JsValue {
    type Error = serde_wasm_bindgen::Error;
    fn try_from(value: Match<'t>) -> Result<Self, Self::Error> {
        serde_wasm_bindgen::to_value(&value)
    }
}

impl<'t> Serialize for Match<'t> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut hir = serializer.serialize_struct("Match", 3)?;
        hir.serialize_field("start", &self.0.start())?;
        hir.serialize_field("end", &self.0.end())?;
        hir.serialize_field("value", &self.0.as_str())?;
        hir.end()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const CAPTURES_TYPE: &'static str = r#"/**
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
}"#;

impl<'t> Match<'t> {
    pub fn captures(
        captures: regex::Captures,
        captures_names: regex::CaptureNames,
    ) -> Result<JsValue, serde_wasm_bindgen::Error> {
        let matches = js_sys::Array::new();
        let names = js_sys::Object::new();
        for (index, name) in captures_names.enumerate() {
            if let Some(m) = captures.get(index) {
                let v = JsValue::try_from(Match::from(m))?;
                matches.push(&v);
            }

            if let Some(n) = name {
                if let Some(m) = captures.name(n) {
                    let v = JsValue::try_from(Match::from(m))?;
                    js_sys::Reflect::set(&names, &JsValue::from(n), &v)?;
                }
            }
        }

        let result = js_sys::Object::new();
        js_sys::Reflect::set(&result, &JsValue::from("get"), &matches)?;
        js_sys::Reflect::set(&result, &JsValue::from("name"), &names)?;
        Ok(JsValue::from(result))
    }
}

pub struct Hir<T>(T);

impl<T> From<T> for Hir<T> {
    fn from(value: T) -> Self {
        Hir(value)
    }
}

impl<T> TryFrom<Hir<T>> for JsValue
where
    Hir<T>: Serialize,
{
    type Error = serde_wasm_bindgen::Error;
    fn try_from(value: Hir<T>) -> Result<Self, Self::Error> {
        serde_wasm_bindgen::to_value(&value)
    }
}

#[wasm_bindgen(typescript_custom_section)]
const HIR_TYPE: &'static str = r#"/**
 * A high-level intermediate representation (HIR) for a regular expression.
 */
export type Hir = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Hir'
  kind: HirKind
}"#;

impl Serialize for Hir<&hir::Hir> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut hir = serializer.serialize_struct("Hir", 3)?;
        hir.serialize_field("@type", "struct")?;
        hir.serialize_field("@name", "regex_syntax::hir::Hir")?;
        hir.serialize_field("kind", &Hir::from(self.0.kind()))?;
        hir.end()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const HIRKIND_TYPE: &'static str = r#"/**
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
}"#;

impl Serialize for Hir<&hir::HirKind> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut hir = serializer.serialize_struct("HirKind", 4)?;
        hir.serialize_field("@type", "enum")?;
        hir.serialize_field("@name", "regex_syntax::hir::HirKind")?;
        match &self.0 {
            hir::HirKind::Empty => {
                hir.serialize_field("@variant", "Empty")?;
            }
            hir::HirKind::Literal(l) => {
                hir.serialize_field("@variant", "Literal")?;
                hir.serialize_field("@values", &vec![Hir::from(l)])?;
            }
            hir::HirKind::Class(c) => {
                hir.serialize_field("@variant", "Class")?;
                hir.serialize_field("@values", &vec![Hir::from(c)])?;
            }
            hir::HirKind::Look(l) => {
                hir.serialize_field("@variant", "Look")?;
                hir.serialize_field("@values", &vec![Hir::from(l)])?;
            }
            hir::HirKind::Repetition(r) => {
                hir.serialize_field("@variant", "Repetition")?;
                hir.serialize_field("@values", &vec![Hir::from(r)])?;
            }
            hir::HirKind::Capture(c) => {
                hir.serialize_field("@variant", "Capture")?;
                hir.serialize_field("@values", &vec![Hir::from(c)])?;
            }
            hir::HirKind::Concat(c) => {
                let values: Vec<Hir<&hir::Hir>> = c.iter().map(Hir::from).collect();
                hir.serialize_field("@variant", "Concat")?;
                hir.serialize_field("@values", &vec![values])?;
            }
            hir::HirKind::Alternation(a) => {
                let values: Vec<Hir<&hir::Hir>> = a.iter().map(Hir::from).collect();
                hir.serialize_field("@variant", "Alternation")?;
                hir.serialize_field("@values", &vec![values])?;
            }
        };
        hir.end()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const LITERAL_TYPE: &'static str = r#"/**
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
}"#;

impl Serialize for Hir<&Box<[u8]>> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_bytes(self.0.as_ref())
    }
}

impl Serialize for Hir<&hir::Literal> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        // let mut bytes = serializer.serialize_bytes(&self.0.0)?;

        // let mut values = serializer.serialize_seq(Some(1))?;
        // values.serialize_element(&bytes)?;

        let mut hir = serializer.serialize_struct("Literal", 3)?;
        hir.serialize_field("@type", "struct")?;
        hir.serialize_field("@name", "regex_syntax::hir::Literal")?;
        hir.serialize_field("@values", &vec![&Hir::from(&self.0 .0)])?;
        hir.end()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const CLASS_TYPE: &'static str = r#"/**
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
}"#;

impl Serialize for Hir<&hir::Class> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut hir = serializer.serialize_struct("Class", 4)?;
        hir.serialize_field("@type", "enum")?;
        hir.serialize_field("@name", "regex_syntax::hir::Class")?;
        match &self.0 {
            hir::Class::Bytes(b) => {
                hir.serialize_field("@variant", "Bytes")?;
                hir.serialize_field("@values", &vec![Hir::from(b)])?;
            }
            hir::Class::Unicode(b) => {
                hir.serialize_field("@variant", "Unicode")?;
                hir.serialize_field("@values", &vec![Hir::from(b)])?;
            }
        }
        hir.end()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const CLASSUNICODE_TYPE: &'static str = r#"/**
 * A set of characters represented by Unicode scalar values.
 */
export type ClassUnicode = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::ClassUnicode'

  /** The underlying ranges as a slice. */
  ranges: ClassUnicodeRange[]
}"#;

impl Serialize for Hir<&hir::ClassUnicode> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let ranges: &Vec<Hir<&hir::ClassUnicodeRange>> =
            &self.0.ranges().iter().map(Hir::from).collect();

        let mut hir = serializer.serialize_struct("ClassUnicode", 3)?;
        hir.serialize_field("@type", "struct")?;
        hir.serialize_field("@name", "regex_syntax::hir::ClassUnicode")?;
        hir.serialize_field("ranges", ranges)?;
        hir.end()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const CLASSUNICODERANGE_TYPE: &'static str = r#"/**
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
}"#;

impl Serialize for Hir<&hir::ClassUnicodeRange> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut hir = serializer.serialize_struct("ClassUnicodeRange", 5)?;
        hir.serialize_field("@type", "struct")?;
        hir.serialize_field("@name", "regex_syntax::hir::ClassUnicodeRange")?;
        hir.serialize_field("start", &self.0.start())?;
        hir.serialize_field("end", &self.0.end())?;
        hir.serialize_field("len", &self.0.len())?;
        hir.end()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const CLASSBYTES_TYPE: &'static str = r#"/**
 * A set of characters represented by arbitrary bytes (where one byte corresponds
 * to one character).
 */
export type ClassBytes = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::ClassBytes'

  /** The underlying ranges as a slice. */
  ranges: ClassBytesRange[]
}"#;

impl Serialize for Hir<&hir::ClassBytes> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let ranges: &Vec<Hir<&hir::ClassBytesRange>> =
            &self.0.ranges().iter().map(Hir::from).collect();

        let mut hir = serializer.serialize_struct("ClassBytes", 3)?;
        hir.serialize_field("@type", "struct")?;
        hir.serialize_field("@name", "regex_syntax::hir::ClassBytes")?;
        hir.serialize_field("ranges", ranges)?;
        hir.end()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const CLASSBYTESRANGE_TYPE: &'static str = r#"/**
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
}"#;

impl Serialize for Hir<&hir::ClassBytesRange> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut hir = serializer.serialize_struct("ClassBytesRange", 5)?;
        hir.serialize_field("@type", "struct")?;
        hir.serialize_field("@name", "regex_syntax::hir::ClassBytesRange")?;
        hir.serialize_field("start", &self.0.start())?;
        hir.serialize_field("end", &self.0.end())?;
        hir.serialize_field("len", &self.0.len())?;
        hir.end()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const LOOK_TYPE: &'static str = r#" /**
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
}"#;

impl Serialize for Hir<&hir::Look> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut hir = serializer.serialize_struct("Look", 3)?;
        hir.serialize_field("@type", "enum")?;
        hir.serialize_field("@name", "regex_syntax::hir::Look")?;
        match self.0 {
            hir::Look::Start => {
                hir.serialize_field("@variant", "Start")?;
            }
            hir::Look::End => {
                hir.serialize_field("@variant", "End")?;
            }
            hir::Look::StartLF => {
                hir.serialize_field("@variant", "StartLF")?;
            }
            hir::Look::EndLF => {
                hir.serialize_field("@variant", "EndLF")?;
            }
            hir::Look::StartCRLF => {
                hir.serialize_field("@variant", "StartCRLF")?;
            }
            hir::Look::EndCRLF => {
                hir.serialize_field("@variant", "EndCRLF")?;
            }
            hir::Look::WordAscii => {
                hir.serialize_field("@variant", "WordAscii")?;
            }
            hir::Look::WordAsciiNegate => {
                hir.serialize_field("@variant", "WordAsciiNegate")?;
            }
            hir::Look::WordUnicode => {
                hir.serialize_field("@variant", "WordUnicode")?;
            }
            hir::Look::WordUnicodeNegate => {
                hir.serialize_field("@variant", "WordUnicodeNegate")?;
            }
            hir::Look::WordStartAscii => {
                hir.serialize_field("@variant", "WordStartAscii")?;
            }
            hir::Look::WordEndAscii => {
                hir.serialize_field("@variant", "WordEndAscii")?;
            }
            hir::Look::WordStartUnicode => {
                hir.serialize_field("@variant", "WordStartUnicode")?;
            }
            hir::Look::WordEndUnicode => {
                hir.serialize_field("@variant", "WordEndUnicode")?;
            }
            hir::Look::WordStartHalfAscii => {
                hir.serialize_field("@variant", "WordStartHalfAscii")?;
            }
            hir::Look::WordEndHalfAscii => {
                hir.serialize_field("@variant", "WordEndHalfAscii")?;
            }
            hir::Look::WordStartHalfUnicode => {
                hir.serialize_field("@variant", "WordStartHalfUnicode")?;
            }
            hir::Look::WordEndHalfUnicode => {
                hir.serialize_field("@variant", "WordEndHalfUnicode")?;
            }
        };
        hir.end()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const REPETITION_TYPE: &'static str = r#"/**
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
}"#;

impl Serialize for Hir<&hir::Repetition> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut hir = serializer.serialize_struct("Repetition", 6)?;
        hir.serialize_field("@type", "struct")?;
        hir.serialize_field("@name", "regex_syntax::hir::Repetition")?;
        hir.serialize_field("min", &self.0.min)?;
        hir.serialize_field("max", &self.0.max)?;
        hir.serialize_field("greedy", &self.0.greedy)?;
        hir.serialize_field("sub", &Hir::from(self.0.sub.as_ref()))?;
        hir.end()
    }
}

#[wasm_bindgen(typescript_custom_section)]
const CAPTURE_TYPE: &'static str = r#"/**
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
}"#;

impl Serialize for Hir<&hir::Capture> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut hir = serializer.serialize_struct("Capture", 5)?;
        hir.serialize_field("@type", "struct")?;
        hir.serialize_field("@name", "regex_syntax::hir::Capture")?;
        hir.serialize_field("index", &self.0.index)?;
        hir.serialize_field("name", &self.0.name)?;
        hir.serialize_field("sub", &Hir::from(self.0.sub.as_ref()))?;
        hir.end()
    }
}
