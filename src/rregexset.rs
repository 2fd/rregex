use wasm_bindgen::prelude::*;

type Result<T> = std::result::Result<T, serde_wasm_bindgen::Error>;

/// Match multiple (possibly overlapping) regular expressions in a single scan.
/// A regex set corresponds to the union of two or more regular expressions.
///
/// That is, a regex set will match text where at least one of its constituent
/// regular expressions matches. A regex set as its formulated here provides a
/// touch more power: it will also report which regular expressions in the set match.
/// Indeed, this is the key difference between regex sets and a single `Regex`
/// with many alternates, since only one alternate can match at a time.
///
/// @see https://docs.rs/regex/latest/regex/struct.RegexSet.html#method.empty
#[wasm_bindgen]
pub struct RRegexSet {
    regexes: regex::RegexSet,
}

#[wasm_bindgen]
impl RRegexSet {

    /// Create a new regex set with the given regular expressions.
    ///
    /// This takes an of strings, if any item in the list is not a valid regular
    /// expressions, then an error is returned.
    ///
    /// # Example
    ///
    /// Create a new regex set from an iterator of strings:
    ///
    /// ```typescript
    /// const set = new RegexSet(["\\w+", "\\d+"])
    /// expect(set.is_match("foo")).toBe(true)
    /// ```
    #[wasm_bindgen(constructor)]
    pub fn new(list: &js_sys::Array) -> Result<RRegexSet> {
        let mut patterns: Vec<String> = Vec::with_capacity(list.length() as usize);
        for (position, item) in list.iter().enumerate() {
          let pattern = item.as_string()
            .ok_or(serde_wasm_bindgen::Error::new(format!("item in position {} is not a string", position)))?;

          patterns.push(pattern)
        };

        let regexes = regex::RegexSet::new(patterns)
          .map_err(|err| serde_wasm_bindgen::Error::new(err.to_string()))?;

        Ok(RRegexSet { regexes })
    }

    /// Returns true if and only if one of the regexes in this set matches
    /// the text given.
    ///
    /// This method should be preferred if you only need to test whether any
    /// of the regexes in the set should match, but don't care about *which*
    /// regexes matched. This is because the underlying matching engine will
    /// quit immediately after seeing the first match instead of continuing to
    /// find all matches.
    ///
    /// Note that as with searches using `Regex`, the expression is unanchored
    /// by default. That is, if the regex does not start with `^` or `\A`, or
    /// end with `$` or `\z`, then it is permitted to match anywhere in the
    /// text.
    ///
    /// # Example
    ///
    /// Tests whether a set matches some text:
    ///
    /// ```typescript
    /// const set = new RegexSet(["\\w+", "\\d+"])
    /// expect(set.is_match("foo")).toBe(true)
    /// expect(!set.is_match("☃")).toBe(false)
    /// ```
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.RegexSet.html#method.is_match
    /// @param {string} text - The string against which to match the regular expression
    /// @return {boolean}
    #[wasm_bindgen(skip_jsdoc, js_name = isMatch)]
    pub fn is_match(&self, text: &str) -> bool {
        self.regexes.is_match(text)
    }

    /// Returns the set of regular expressions that match in the given text.
    ///
    /// The set returned contains the index of each regular expression that
    /// matches in the given text. The index is in correspondence with the
    /// order of regular expressions given to `RegexSet`'s constructor.
    ///
    /// The set can also be used to iterate over the matched indices.
    ///
    /// Note that as with searches using `Regex`, the expression is unanchored
    /// by default. That is, if the regex does not start with `^` or `\A`, or
    /// end with `$` or `\z`, then it is permitted to match anywhere in the
    /// text.
    ///
    /// # Example
    ///
    /// Tests which regular expressions match the given text:
    ///
    /// ```typescript
    /// const set = new RegexSet([
    ///     "\\w+",
    ///     "\\d+",
    ///     "\\pL+",
    ///     "foo",
    ///     "bar",
    ///     "barfoo",
    ///     "foobar",
    /// ])
    /// const matches = set.matches("foobar")
    /// expect(matches).toBe([0, 2, 3, 4, 6])
    /// ```
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.RegexSet.html#method.matches
    /// @param {string} text - The string against which to match the regular expression
    /// @return {number[]}
    #[wasm_bindgen(skip_jsdoc)]
    pub fn matches(&self, text: &str) -> Vec<JsValue> {
        self.regexes.matches(text).iter().map(JsValue::from).collect()
    }
}
