use crate::utils::ToJs;
use crate::{set, JsArray, JsObject};
use regex;
use regex_syntax::hir;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const HIR_TYPE: &'static str = r#"
export type Hir = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Hir'
  kind: HirKind
}
"#;

impl ToJs for hir::Hir {
  fn to_js(&self) -> JsValue {
    JsObject!("@type" => "struct", "@name" => "regex_syntax::hir::Hir", "kind" => self.kind().to_js())
  }
}


#[wasm_bindgen(typescript_custom_section)]
const HIRKIND_TYPE: &'static str = r#"
export type HirKind =
  | HirKindEmptyVariant
  | HirKindLiteralVariant
  | HirKindClassVariant
  | HirKindAnchorVariant
  | HirKindWordBoundaryVariant
  | HirKindRepetitionVariant
  | HirKindGroupVariant
  | HirKindConcatVariant
  | HirKindAlternationVariant

export type HirKindEmptyVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Empty'
}

export type HirKindLiteralVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Literal'
  '@values': [Literal]
}

export type HirKindClassVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Class'
  '@values': [Class]
}

export type HirKindAnchorVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Anchor'
  '@values': [Anchor]
}

export type HirKindWordBoundaryVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'WordBoundary'
  '@values': [WordBoundary]
}

export type HirKindRepetitionVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Repetition'
  '@values': [Repetition]
}

export type HirKindGroupVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Group'
  '@values': [Group]
}

export type HirKindConcatVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Concat'
  '@values': [Hir[]]
}

export type HirKindAlternationVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Alternation'
  '@values': [Hir[]]
}
"#;

impl ToJs for hir::HirKind {
  fn to_js(&self) -> JsValue {
    let current = JsObject!("@type" => "enum", "@name" => "regex_syntax::hir::HirKind");
    match self {
      hir::HirKind::Empty => set!(&current, "@variant" => "Empty"),
      hir::HirKind::Literal(l) => set!(&current, "@variant" => "Literal", "@values" => JsArray!(l.to_js())),
      hir::HirKind::Class(c) => set!(&current, "@variant" => "Class", "@values" => JsArray!(c.to_js())),
      hir::HirKind::Anchor(a) => set!(&current, "@variant" => "Anchor", "@values" => JsArray!(a.to_js())),
      hir::HirKind::WordBoundary(w) => set!(&current, "@variant" => "WordBoundary", "@values" => JsArray!(w.to_js())),
      hir::HirKind::Repetition(r) => set!(&current, "@variant" => "Repetition", "@values" => JsArray!(r.to_js())),
      hir::HirKind::Group(g) => set!(&current, "@variant" => "Group", "@values" => JsArray!(g.to_js())),
      hir::HirKind::Concat(c) => set!(&current, "@variant" => "Concat", "@values" => JsArray!(c.to_js())),
      hir::HirKind::Alternation(c) => set!(&current, "@variant" => "Alternation", "@values" => JsArray!(c.to_js())),
    };
    current
  }
}

#[wasm_bindgen(typescript_custom_section)]
const LITERAL_TYPE: &'static str = r#"
export type Literal =
  | LiteralUnicodeVariant
  | LiteralByteVariant

export type LiteralUnicodeVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Literal'
  '@variant': 'Unicode'
  '@values': [string]
}

export type LiteralByteVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Literal'
  '@variant': 'Byte'
  '@values': [number]
}
"#;

impl ToJs for hir::Literal {
  fn to_js(&self) -> JsValue {
    let current = JsObject!("@type" => "enum", "@name" => "regex_syntax::hir::Literal");
    match self {
      hir::Literal::Unicode(unicode) => set!(&current, "@variant" => "Unicode", "@values" => JsArray!(unicode.to_string())),
      hir::Literal::Byte(byte) => set!(&current,  "@variant" => "Byte", "@values" => JsArray!(byte.to_owned() as i32)),
    };
    current
  }
}

#[wasm_bindgen(typescript_custom_section)]
const CLASS_TYPE: &'static str = r#"
export type Class =
  | ClassUnicodeVariant
  | ClassByteVariant

export type ClassUnicodeVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Class'
  '@variant': 'Unicode'
  '@values': [ClassUnicode]
}

export type ClassByteVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Class'
  '@variant': 'Bytes'
  '@values': [ClassBytes]
}
"#;

impl ToJs for hir::Class {
  fn to_js(&self) -> JsValue {
    let current = JsObject!("@type" => "enum", "@name" => "regex_syntax::hir::Class");
    match self {
      hir::Class::Unicode(unicode) => set!(&current, "@variant" => "Unicode", "@values" => JsArray!(unicode.to_js())),
      hir::Class::Bytes(byte) => set!(&current, "@variant" => "Bytes", "@values" => JsArray!(byte.to_js())),
    };
    current
  }
}

#[wasm_bindgen(typescript_custom_section)]
const CLASSUNICODE_TYPE: &'static str = r#"
export type ClassUnicode = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::ClassUnicode'
  'ranges': ClassUnicodeRange[]
}
"#;

impl ToJs for hir::ClassUnicode {
  fn to_js(&self) -> JsValue {
    let current = JsObject!("@type" => "struct", "@name" => "regex_syntax::hir::ClassUnicode");
    let ranges: Vec<hir::ClassUnicodeRange> = self.ranges().iter().map(|c| c.to_owned()).collect();
    set!(&current, "ranges" => ranges.to_js());
    current
  }
}

#[wasm_bindgen(typescript_custom_section)]
const CLASSUNICODERANGE_TYPE: &'static str = r#"
export type ClassUnicodeRange = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::ClassUnicodeRange'
  start: string
  end: string
}
"#;

impl ToJs for hir::ClassUnicodeRange {
  fn to_js(&self) -> JsValue {
    JsObject!(
      "@type" => "struct",
      "@name" => "regex_syntax::hir::ClassUnicodeRange",
      "start" => self.start().to_string(),
      "end" => self.end().to_string()
    )
  }
}

#[wasm_bindgen(typescript_custom_section)]
const CLASSBYTES_TYPE: &'static str = r#"
export type ClassBytes = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::ClassBytes'
  ranges: ClassBytesRange[]
}
"#;

impl ToJs for hir::ClassBytes {
  fn to_js(&self) -> JsValue {
    let current = JsObject!("@type" => "struct", "@name" => "regex_syntax::hir::ClassBytes");
    let ranges: Vec<hir::ClassBytesRange> = self.ranges().iter().map(|c| c.to_owned()).collect();
    set!(&current, "ranges" => ranges.to_js());
    current
  }
}

#[wasm_bindgen(typescript_custom_section)]
const CLASSBYTESRANGE_TYPE: &'static str = r#"
export type ClassBytesRange = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::ClassBytesRange'
  start: number
  end: number
}
"#;

impl ToJs for hir::ClassBytesRange {
  fn to_js(&self) -> JsValue {
    JsObject!(
      "@type" => "struct",
      "@name" => "regex_syntax::hir::ClassBytesRange",
      "start" => self.start().to_owned() as i32,
      "end" => self.end().to_owned() as i32
    )
  }
}

#[wasm_bindgen(typescript_custom_section)]
const ANCHOR_TYPE: &'static str = r#"
export type Anchor =
  | AnchorStartLineVariant
  | AnchorEndLineVariant
  | AnchorStartTextVariant
  | AnchorEndTextVariant

export type AnchorStartLineVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Anchor'
  '@variant': 'StartLine'
}

export type AnchorEndLineVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Anchor'
  '@variant': 'EndLine'
}

export type AnchorStartTextVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Anchor'
  '@variant': 'StartText'
}

export type AnchorEndTextVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Anchor'
  '@variant': 'EndText'
}
"#;

impl ToJs for hir::Anchor {
  fn to_js(&self) -> JsValue {
    let current = JsObject!("@type" => "enum", "@name" => "regex_syntax::hir::Anchor");
    match self {
      hir::Anchor::StartLine => set!(&current, "@variant" => "StartLine"),
      hir::Anchor::EndLine => set!(&current, "@variant" => "EndLine"),
      hir::Anchor::StartText => set!(&current, "@variant" => "StartText"),
      hir::Anchor::EndText => set!(&current, "@variant" => "EndText"),
    };
    current
  }
}

#[wasm_bindgen(typescript_custom_section)]
const WORDBOUNDARY_TYPE: &'static str = r#"
export type WordBoundary =
  | WordBoundaryAsciiVariant
  | WordBoundaryAsciiNegateVariant
  | WordBoundaryUnicodeVariant
  | WordBoundaryUnicodeNegateVariant

export type WordBoundaryAsciiVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::WordBoundary'
  '@variant': 'Ascii'
}

export type WordBoundaryAsciiNegateVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::WordBoundary'
  '@variant': 'AsciiNegate'
}

export type WordBoundaryUnicodeVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::WordBoundary'
  '@variant': 'Unicode'
}

export type WordBoundaryUnicodeNegateVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::WordBoundary'
  '@variant': 'UnicodeNegate'
}
"#;

impl ToJs for hir::WordBoundary {
  fn to_js(&self) -> JsValue {
    let current = JsObject!("@type" => "enum", "@name" => "regex_syntax::hir::WordBoundary");
    match self {
      hir::WordBoundary::Ascii => set!(&current, "@variant" => "Ascii"),
      hir::WordBoundary::AsciiNegate => set!(&current, "@variant" => "AsciiNegate"),
      hir::WordBoundary::Unicode => set!(&current, "@variant" => "Unicode"),
      hir::WordBoundary::UnicodeNegate => set!(&current, "@variant" => "UnicodeNegate"),
    };
    current
  }
}

#[wasm_bindgen(typescript_custom_section)]
const REPETITION_TYPE: &'static str = r#"
export type Repetition = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Repetition'
  greedy: boolean
  kind: RepetitionKind
  hir: Hir
}
"#;

impl ToJs for hir::Repetition {
  fn to_js(&self) -> JsValue {
    JsObject!(
      "@type" => "struct",
      "@name" => "regex_syntax::hir::Repetition",
      "greedy" => self.greedy,
      "kind" => self.kind.to_js(),
      "hir" => self.hir.to_js()
    )
  }
}

#[wasm_bindgen(typescript_custom_section)]
const REPETITIONKIND_TYPE: &'static str = r#"
export type RepetitionKind =
  | RepetitionKindZeroOrOneVariant
  | RepetitionKindZeroOrMoreVariant
  | RepetitionKindOneOrMoreVariant
  | RepetitionKindRangeVariant

export type RepetitionKindZeroOrOneVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Repetition'
  '@variant': 'ZeroOrOne'
}

export type RepetitionKindZeroOrMoreVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Repetition'
  '@variant': 'ZeroOrMore'
}

export type RepetitionKindOneOrMoreVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Repetition'
  '@variant': 'OneOrMore'
}

export type RepetitionKindRangeVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Repetition'
  '@variant': 'Range'
  '@values': [RepetitionRange]
}
"#;

impl ToJs for hir::RepetitionKind {
  fn to_js(&self) -> JsValue {
    let current = JsObject!("@type" => "enum", "@name" => "regex_syntax::hir::RepetitionKind");
    match self {
      hir::RepetitionKind::ZeroOrOne => set!(&current, "@variant" => "ZeroOrOne"),
      hir::RepetitionKind::ZeroOrMore => set!(&current, "@variant" => "ZeroOrMore"),
      hir::RepetitionKind::OneOrMore => set!(&current, "@variant" => "OneOrMore"),
      hir::RepetitionKind::Range(range) => set!(&current, "@variant" => "Range", "@values" => JsArray!(range.to_js())),
    };
    current
  }
}

#[wasm_bindgen(typescript_custom_section)]
const REPETITIONRANGE_TYPE: &'static str = r#"
export type RepetitionRange =
  | RepetitionRangeExactlyVariant
  | RepetitionRangeAtLeastVariant
  | RepetitionRangeBoundedVariant

export type RepetitionRangeExactlyVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::RepetitionRange'
  '@variant': 'Exactly'
  '@values': [number]
}

export type RepetitionRangeAtLeastVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::RepetitionRange'
  '@variant': 'AtLeast'
  '@values': [number]
}

export type RepetitionRangeBoundedVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::RepetitionRange'
  '@variant': 'Bounded'
  '@values': [number, number]
}
"#;

impl ToJs for hir::RepetitionRange {
  fn to_js(&self) -> JsValue {
    let current = JsObject!("@type" => "enum", "@name" => "regex_syntax::hir::RepetitionRange");
    match self {
      hir::RepetitionRange::Exactly(val) => set!(&current, "@variant" => "Exactly", "@values" => JsArray!(val.to_owned() as f64)),
      hir::RepetitionRange::AtLeast(min) => set!(&current, "@variant" => "AtLeast", "@values" => JsArray!(min.to_owned() as f64)),
      hir::RepetitionRange::Bounded(min, max) => set!(&current, "@variant" => "Bounded", "@values" => JsArray!(min.to_owned() as f64, max.to_owned() as f64)),
    };
    current
  }
}

#[wasm_bindgen(typescript_custom_section)]
const GROUP_TYPE: &'static str = r#"
export type Group = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Group'
  kind: GroupKind
  hir: Hir
}
"#;

impl ToJs for hir::Group {
  fn to_js(&self) -> JsValue {
    JsObject!(
      "@type" => "struct",
      "@name" => "regex_syntax::hir::Group",
      "kind" => self.kind.to_js(),
      "hir" => self.hir.to_js()
    )
  }
}

#[wasm_bindgen(typescript_custom_section)]
const GROUPKIND_TYPE: &'static str = r#"
export type GroupKind =
  | GroupKindCaptureIndexVariant
  | GroupKindCaptureNameVariant
  | GroupKindNonCapturingVariant

export type GroupKindCaptureIndexVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::GroupKind'
  '@variant': 'CaptureIndex'
  index: number
}

export type GroupKindCaptureNameVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::GroupKind'
  '@variant': 'CaptureName'
  index: number
  name: string
}

export type GroupKindNonCapturingVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::GroupKind'
  '@variant': 'NonCapturing'
}
"#;

impl ToJs for hir::GroupKind {
  fn to_js(&self) -> JsValue {
    let current = JsObject!("@type" => "enum", "@name" => "regex_syntax::hir::GroupKind");
    match self {
      hir::GroupKind::CaptureIndex(index) => set!(&current, "@variant" => "CaptureIndex", "index" => index.to_owned() as f64),
      hir::GroupKind::CaptureName { name, index } => set!(&current, "@variant" => "CaptureName", "index" => index.to_owned() as f64, "name" => name.to_owned()),
      hir::GroupKind::NonCapturing => set!(&current, "@variant" => "NonCapturing"),
    };
    current
  }
}

#[wasm_bindgen(typescript_custom_section)]
const MATCH_TYPE: &'static str = r#"
export type Match = {
  start: number
  end: number
  value: string
}
"#;

impl<'t> ToJs for regex::Match<'t> {
  fn to_js(&self) -> JsValue {
    JsObject!(
      "start" => self.start() as f64,
      "end" => self.end() as f64,
      "value" => self.as_str().to_owned().to_js()
    )
  }
}
