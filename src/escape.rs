use wasm_bindgen::prelude::*;

/// Escapes all regular expression meta characters in `text`.
///
/// The string returned may be safely used as a literal in a regular
/// expression.
#[wasm_bindgen]
pub fn escape(text: &str) -> String {
  regex::escape(text)
}