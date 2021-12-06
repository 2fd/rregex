use crate::utils::{error, ToJs};
use regex;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

/// Match multiple (possibly overlapping) regular expressions in a single scan.
/// A regex set corresponds to the union of two or more regular expressions. That is, a regex set will match text where at least one of its constituent regular expressions matches. A regex set as its formulated here provides a touch more power: it will also report which regular expressions in the set match. Indeed, this is the key difference between regex sets and a single `Regex` with many alternates, since only one alternate can match at a time.
/// @see https://docs.rs/regex/latest/regex/struct.RegexSet.html#method.empty
#[wasm_bindgen]
pub struct RRegexSet {
  regexes: regex::RegexSet,
}

#[wasm_bindgen]
impl RRegexSet {

  /// Create a new regex set with the given regular expressions.
  #[wasm_bindgen(constructor)]
  pub fn new(list: &js_sys::Array) -> Result<RRegexSet, JsValue> {
    let patters:  &mut Vec<String> = &mut Vec::new();
    for each in list.iter() {
      if !each.is_string() {
        return Err(error("\"list\" is not \"string[]\""))
      }
      if let Some(pattern) = each.as_string() {
        patters.push(pattern);
      }
    }
    match regex::RegexSet::new(patters) {
      Err(e) => Err(error(e)),
      Ok(regexes) => Ok(RRegexSet { regexes }),
    }
  }

  /// Returns true if and only if one of the regexes in this set matches the text given.
  /// This method should be preferred if you only need to test whether any of the regexes in the set should match, but don’t care about which regexes matched. This is because the underlying matching engine will quit immediately after seeing the first match instead of continuing to find all matches.
  /// @see https://docs.rs/regex/latest/regex/struct.RegexSet.html#method.is_match
  #[wasm_bindgen(js_name = isMatch)]
  pub fn is_match(&self, text: &str) -> bool {
    self.regexes.is_match(text)
  }

  /// Returns the set of regular expressions that match in the given text.
  /// The set returned contains the index of each regular expression that matches in the given text. The index is in correspondence with the order of regular expressions given to RegexSet’s constructor.
  /// the set can also be used to iterate over the matched indices.
  #[wasm_bindgen]
  pub fn matches(&self, text: &str) -> JsValue {
    let results: Vec<usize> = self.regexes.matches(text).into_iter().collect();
    results.to_js()
  }
}