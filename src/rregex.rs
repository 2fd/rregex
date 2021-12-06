use crate::utils::{error, result, ToJs};
use regex;
use regex_syntax::Parser;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

/// A compiled regular expression for matching Unicode strings.
/// @see https://docs.rs/regex/latest/regex/
#[wasm_bindgen]
pub struct RRegex {
  regex: regex::Regex,
}

#[wasm_bindgen]
impl RRegex {

  /// Compiles a regular expression. Once compiled, it can be used repeatedly to search, split or replace text in a string.
  /// If an invalid expression is given, then an error is returned.
  #[wasm_bindgen(constructor)]
  pub fn new(re: &str) -> Result<RRegex, JsValue> {
    match regex::Regex::new(re) {
      Err(e) => Err(error(e)),
      Ok(regex) => Ok(RRegex { regex }),
    }
  }

  /// Returns true if and only if there is a match for the regex in the string given.
  /// It is recommended to use this method if all you need to do is test a match, since the underlying matching engine may be able to do less work.
  /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.is_match
  #[wasm_bindgen(js_name = isMatch)]
  pub fn is_match(&self, text: &str) -> bool {
    self.regex.is_match(text)
  }

  /// Returns the same as is_match, but starts the search at the given offset.
  /// The significance of the starting point is that it takes the surrounding context into consideration. For example, the `\A` anchor can only match when `start == 0`.
  /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.is_match_at
  #[wasm_bindgen(js_name = isMatchAt)]
  pub fn is_match_at(&self, text: &str, start: usize) -> bool {
    if text.len() < start {
      false
    } else {
      self.regex.is_match_at(text, start)
    }
  }

  /// Returns the start and end byte range of the leftmost-first match in `text`. If no match exists, then `undefined` is returned.
  /// Note that this should only be used if you want to discover the position of the match. Testing the existence of a match is faster if you use `is_match`.
  /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.find
  pub fn find(&self, text: &str) -> JsValue {
    self.regex.find(text).to_js()
  }

  /// Returns the same as find, but starts the search at the given offset.
  /// The significance of the starting point is that it takes the surrounding context into consideration. For example, the \A anchor can only match when `start == 0`.
  /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.find_at
  #[wasm_bindgen(js_name = findAt)]
  pub fn find_at(&self, text: &str, start: usize) -> JsValue {
    if text.len() < start {
      JsValue::UNDEFINED
    } else {
      self.regex.find_at(text, start).to_js()
    }
  }

  /// Returns an array for each successive non-overlapping match in text, returning the start and end byte indices with respect to text.
  /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.find_iter
  #[wasm_bindgen(js_name = findAll)]
  pub fn find_all(&self, text: &str) -> JsValue {
    let matches: Vec<regex::Match> = self.regex.find_iter(text).collect();
    matches.to_js()
  }


  /// Replaces the leftmost-first match with the replacement provided.
  /// The replacement can be a regular string (where `$N` and `$name` are expanded to match capture groups) or a function that takes the matches’ `Captures` and returns the replaced string.
  /// If no match is found, then a copy of the string is returned unchanged.
  /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.replace
  pub fn replace(&self, text: &str, rep: &str) -> String {
    self.regex.replace(text, rep).into_owned()
  }

  /// Replaces at most `limit` non-overlapping matches in `text` with the replacement provided. If `limit` is 0, then all non-overlapping matches are replaced.
  /// See the documentation for `replace` for details on how to access capturing group matches in the replacement string.
  /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.replacen
  pub fn replacen(&self, text: &str, limit: usize, rep: &str) -> String {
    self.regex.replacen(text, limit, rep).into_owned()
  }

  /// Replaces all non-overlapping matches in `text` with the replacement provided. This is the same as calling `replacen` with `limit` set to `0`.
  /// See the documentation for `replace` for details on how to access capturing group matches in the replacement string.
  /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.replace_all
  #[wasm_bindgen(js_name = replaceAll)]
  pub fn replace_all(&self, text: &str, rep: &str) -> String {
    self.regex.replace_all(text, rep).into_owned()
  }

  /// Returns an iterator of substrings of `text` delimited by a match of the regular expression. Namely, each element of the iterator corresponds to text that isn’t matched by the regular expression.
  /// This method will not copy the text given.
  /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.split
  pub fn split(&self, text: &str) -> JsValue {
    let splits: Vec<String> = self.regex.split(text).map(|s| s.to_string()).collect();
    splits.to_js()
  }

  /// Returns an iterator of at most `limit` substrings of `text` delimited by a match of the regular expression. (A limit of 0 will return no substrings.) Namely, each element of the iterator corresponds to text that isn’t matched by the regular expression. The remainder of the string that is not split will be the last element in the iterator.
  /// This method will not copy the text given.
  /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.splitn
  pub fn splitn(&self, text: &str, limit: usize) -> JsValue {
    let splits: Vec<String> = self
      .regex
      .splitn(text, limit)
      .map(|s| s.to_string())
      .collect();
    splits.to_js()
  }

  /// Returns the end location of a match in the text given.
  /// This method may have the same performance characteristics as `is_match`, except it provides an end location for a match. In particular, the location returned may be shorter than the proper end of the leftmost-first match.
  /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.shortest_match
  #[wasm_bindgen(js_name = shortestMatch)]
  pub fn shortest_match(&self, text: &str) -> Option<usize> {
    self.regex.shortest_match(text)
  }

  /// Returns the same as shortest_match, but starts the search at the given offset.
  /// The significance of the starting point is that it takes the surrounding context into consideration. For example, the \A anchor can only match when `start == 0`.
  /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.shortest_match_at
  #[wasm_bindgen(js_name = shortestMatchAt)]
  pub fn shortest_match_at(&self, text: &str, limit: usize) -> Option<usize> {
    if text.len() < limit {
      None
    } else {
      self.regex.shortest_match_at(text, limit)
    }
  }

  /// Return the Regex syntax object
  pub fn syntax(&self) -> JsValue {
    let mut parser = Parser::new();
    result(parser.parse(self.regex.as_str()))
  }

  /// Returns a string representing the regular expression
  #[wasm_bindgen(js_name = toString)]
  pub fn to_string(&self) -> String {
    self.regex.as_str().to_owned()
  }
}
