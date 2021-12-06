use regex;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn escape(text: &str) -> String {
  regex::escape(text)
}