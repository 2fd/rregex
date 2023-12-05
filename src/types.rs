use crate::utils::ToJs;
use crate::{set, JsArray, JsObject};
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
  | HirKindLookVariant
  | HirKindRepetitionVariant
  | HirKindCaptureVariant
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

export type HirKindLookVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Look'
  '@values': [Look]
}

export type HirKindRepetitionVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Repetition'
  '@values': [Repetition]
}

export type HirKindCaptureVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::HirKind'
  '@variant': 'Capture'
  '@values': [Capture]
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
      hir::HirKind::Look(a) => set!(&current, "@variant" => "Look", "@values" => JsArray!(a.to_js())),
      hir::HirKind::Repetition(r) => set!(&current, "@variant" => "Repetition", "@values" => JsArray!(r.to_js())),
      hir::HirKind::Capture(g) => set!(&current, "@variant" => "Capture", "@values" => JsArray!(g.to_js())),
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
const LOOK_TYPE: &'static str = r#"
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

export type LookStartVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'Start'
}

export type LookEndVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'End'
}

export type LookStartLFVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'StartLF'
}

export type LookEndLFVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'EndLF'
}

export type LookStartCRLFVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'StartCRLF'
}

export type LookEndCRLFVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'EndCRLF'
}

export type LookWordAsciiVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'WordAscii'
}

export type LookWordAsciiNegateVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'WordAsciiNegate'
}

export type LookWordUnicodeVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'WordUnicode'
}

export type LookWordUnicodeNegateVariant = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir:Look'
  '@variant': 'WordUnicodeNegate'
}

"#;

impl ToJs for hir::Look {
  fn to_js(&self) -> JsValue {
    let current = JsObject!("@type" => "enum", "@name" => "regex_syntax::hir::Look");
    match self {
      hir::Look::Start  => set!(&current, "@variant" => "Start"),
      hir::Look::End  => set!(&current, "@variant" => "End"),
      hir::Look::StartLF  => set!(&current, "@variant" => "StartLF"),
      hir::Look::EndLF  => set!(&current, "@variant" => "EndLF"),
      hir::Look::StartCRLF  => set!(&current, "@variant" => "StartCRLF"),
      hir::Look::EndCRLF  => set!(&current, "@variant" => "EndCRLF"),
      hir::Look::WordAscii  => set!(&current, "@variant" => "WordAscii"),
      hir::Look::WordAsciiNegate  => set!(&current, "@variant" => "WordAsciiNegate"),
      hir::Look::WordUnicode  => set!(&current, "@variant" => "WordUnicode"),
      hir::Look::WordUnicodeNegate  => set!(&current, "@variant" => "WordUnicodeNegate"),
    };
    current
  }
}

#[wasm_bindgen(typescript_custom_section)]
const REPETITION_TYPE: &'static str = r#"
export type Repetition = {
  '@type': 'struct'
  '@name': 'regex_syntax::hir::Repetition'
  min: number
  max?: number
  greedy: boolean
  sub: Hir
}
"#;

impl ToJs for hir::Repetition {
  fn to_js(&self) -> JsValue {
    JsObject!(
      "@type" => "struct",
      "@name" => "regex_syntax::hir::Repetition",
      "min" => self.min.to_js(),
      "max" => self.min.to_js(),
      "greedy" => self.greedy,
      "kind" => self.sub.to_js(),
      "hir" => self.sub.to_js()
    )
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
