use std::convert::TryInto;

use crate::types::Hir;
use crate::types::Match;
use regex_syntax::Parser;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

type Result<T> = std::result::Result<T, serde_wasm_bindgen::Error>;

/// A compiled regular expression for matching Unicode strings.
/// @see https://docs.rs/regex/latest/regex/
#[wasm_bindgen]
pub struct RRegex {
    regex: regex::Regex,
}

#[wasm_bindgen]
impl RRegex {
    /// Compiles a regular expression. Once compiled, it can be used repeatedly
    /// to search, split or replace text in a string.
    ///
    /// If an invalid expression is given, then an error is returned.
    #[wasm_bindgen(constructor)]
    pub fn new(re: &str) -> Result<RRegex> {
        let r = regex::Regex::new(re).map_err(serde_wasm_bindgen::Error::new)?;

        Ok(RRegex { regex: r })
    }

    /// Returns true if and only if there is a match for the regex in the
    /// string given.
    ///
    /// It is recommended to use this method if all you need to do is test
    /// a match, since the underlying matching engine may be able to do less
    /// work.
    ///
    /// # Example
    ///
    /// Test if some text contains at least one word with exactly 13
    /// Unicode word characters:
    ///
    /// ```typescript
    /// const text = "I categorically deny having triskaidekaphobia."
    /// expect(new RRegex("\\b\\w{13}\\b").is_match(text)).toBe(true)
    /// ```
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.is_match
    /// @param {string} text - The string against which to match the regular expression
    /// @return {boolean}
    #[wasm_bindgen(skip_jsdoc, js_name = isMatch)]
    pub fn is_match(&self, text: &str) -> bool {
        self.regex.is_match(text)
    }

    /// Returns the same as is_match, but starts the search at the given offset.
    /// The significance of the starting point is that it takes the surrounding
    /// context into consideration. For example, the `\A` anchor can only match
    /// when `start == 0`.
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.is_match_at
    /// @param {string} text - The string against which to match the regular expression
    /// @param {number} start - Zero-based index at which to start matching
    /// @return {boolean}
    #[wasm_bindgen(skip_jsdoc, js_name = isMatchAt)]
    pub fn is_match_at(&self, text: &str, start: usize) -> bool {
        if text.len() < start {
            false
        } else {
            self.regex.is_match_at(text, start)
        }
    }

    /// Returns the start and end byte range of the leftmost-first match in
    /// `text`. If no match exists, then `undefined` is returned.
    ///
    /// Note that this should only be used if you want to discover the position
    /// of the match. Testing the existence of a match is faster if you use
    /// `isMatch`.
    ///
    /// # Example
    ///
    /// Find the start and end location of the first word with exactly 13
    /// Unicode word characters:
    ///
    /// ```typescript
    /// const text = "I categorically deny having triskaidekaphobia."
    /// const m = new Regex("\\b\\w{13}\\b").find(text)
    /// expect(m.start).toBe(2)
    /// expect(m.end).toBe(15)
    /// ```
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.find
    /// @param {string} text - The string against which to match the regular expression
    /// @return {Match}
    #[wasm_bindgen(skip_jsdoc)]
    pub fn find(&self, text: &str) -> Result<JsValue> {
        self.find_at(text, 0)
    }

    /// Returns the same as find, but starts the search at the given
    /// offset.
    ///
    /// The significance of the starting point is that it takes the surrounding
    /// context into consideration. For example, the `\A` anchor can only
    /// match when `start == 0`.
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.find_at
    /// @param {string} text - The string against which to match the regular expression
    /// @param {number} start - Zero-based index at which to start matching
    /// @returns {Match}
    #[wasm_bindgen(skip_jsdoc, js_name = findAt)]
    pub fn find_at(&self, text: &str, start: usize) -> Result<JsValue> {
        if start > text.len() {
            return Ok(JsValue::UNDEFINED);
        };

        let r = self.regex.find_at(text, start);

        match r {
            Some(m) => Match::from(m).try_into(),
            None => Ok(JsValue::UNDEFINED),
        }
    }

    /// Returns an array for each successive non-overlapping match in `text``,
    /// returning the start and end byte indices with respect to `text`.
    ///
    /// # Example
    ///
    /// Find the start and end location of every word with exactly 13 Unicode
    /// word characters:
    ///
    /// ```typescript
    /// const text = "Retroactively relinquishing remunerations is reprehensible."
    /// const matches = new Regex("\\b\\w{13}\\b").findAll(text)
    /// ```
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.find_iter
    /// @param {string} text - The string against which to match the regular expression
    /// @returns {Match}
    #[wasm_bindgen(skip_jsdoc, js_name = findAll)]
    pub fn find_all(&self, text: &str) -> Result<JsValue> {
        let matches: Vec<Match> = self.regex.find_iter(text).map(Match::from).collect();
        serde_wasm_bindgen::to_value(&matches)
    }

    /// Returns a list of the capture names in this regex.
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.capture_names
    #[wasm_bindgen(skip_jsdoc, js_name = captureNames)]
    pub fn capture_names(&self) -> Vec<JsValue> {
        self.regex
            .capture_names()
            .filter_map(|item| item.map(JsValue::from))
            .collect()
    }


    /// Returns the capture groups corresponding to the leftmost-first
    /// match in `text`. Capture group `0` always corresponds to the entire
    /// match. If no match is found, then `undefined` is returned.
    ///
    /// You should only use `captures` if you need access to the location of
    /// capturing group matches. Otherwise, `find` is faster for discovering
    /// the location of the overall match.
    ///
    /// # Examples
    ///
    /// Say you have some text with movie names and their release years,
    /// like "'Citizen Kane' (1941)". It'd be nice if we could search for text
    /// looking like that, while also extracting the movie name and its release
    /// year separately.
    ///
    /// ```typescript
    /// const re = new Regex("'([^']+)'\\s+\\((\\d{4})\)")
    /// const text = "Not my favorite movie: 'Citizen Kane' (1941)."
    /// const caps = re.captures(text)
    /// expect(caps.get[1].value).toBe("Citizen Kane")
    /// expect(caps.get[2].value).toBe("1941")
    /// expect(caps.get[0].value).toBe("'Citizen Kane' (1941)")
    /// ```
    ///
    /// Note that the full match is at capture group `0`. Each subsequent
    /// capture group is indexed by the order of its opening `(`.
    ///
    /// We can make this example a bit clearer by using *named* capture groups:
    ///
    /// ```typescript
    /// const re = new Regex("'(?P<title>[^']+)'\\s+\\((?P<year>\\d{4})\)")
    /// const text = "Not my favorite movie: 'Citizen Kane' (1941)."
    /// const caps = re.captures(text)
    /// expect(caps.name["title"].value).toBe("Citizen Kane")
    /// expect(caps.name["year"].value).toBe("1941")
    /// expect(caps.get[0].value).toBe("'Citizen Kane' (1941)")
    /// ```
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.captures
    /// @param {string} text - The string against which to match the regular expression
    /// @returns {Captures|undefined}
    #[wasm_bindgen(skip_jsdoc)]
    pub fn captures(&self, text: &str) -> Result<JsValue> {
        if let Some(captures) = self.regex.captures(text) {
            Match::captures(captures, self.regex.capture_names())
        } else {
            Ok(JsValue::undefined())
        }
    }

    /// Returns a list with all the non-overlapping capture groups matched
    /// in `text`. This is operationally the same as `findAll`, except it
    /// returns information about capturing group matches.
    ///
    /// # Example
    ///
    /// We can use this to find all movie titles and their release years in
    /// some text, where the movie is formatted like "'Title' (xxxx)":
    ///
    /// ```typescript
    /// const re = new Regex("'(?P<title>[^']+)'\\s+\\((?P<year>\\d{4})\\)")
    /// const text = "'Citizen Kane' (1941), 'The Wizard of Oz' (1939), 'M' (1931)."
    /// for caps of re.captures_iter(text) {
    ///     console.log(
    ///         "Movie:", caps.name["title"].value, ","
    ///         "Released:", caps.name["year"].value
    ///     );
    /// }
    /// // Output:
    /// // Movie: Citizen Kane, Released: 1941
    /// // Movie: The Wizard of Oz, Released: 1939
    /// // Movie: M, Released: 1931
    /// ```
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.captures_iter
    /// @param {string} text - The string against which to match the regular expression
    /// @returns {Captures[]}
    #[wasm_bindgen(skip_jsdoc, js_name = capturesAll)]
    pub fn captures_all(&self, text: &str) -> Result<JsValue> {
        let names = self.regex.capture_names();
        let result = js_sys::Array::new();
        for captures in self.regex.captures_iter(text) {
            let c = Match::captures(captures, names.clone())?;
            result.push(&c);
        }

        Ok(JsValue::from(result))
    }

    /// Returns the number of captures.
    ///
    /// This includes all named and unnamed groups, including the implicit
    /// unnamed group that is always present and corresponds to the entire match.
    ///
    /// Since the implicit unnamed group is always included in this length, the
    /// length returned is guaranteed to be greater than zero.
    ///
    /// ## Example
    ///
    /// ```typescript
    ///  const re1 = new RRegex("(?P<y>\\d{4})-(?P<m>\\d{2})-(?P<d>\\d{2})")
    ///  expect(re1.capturesLength()).toEqual(4)
    ///
    ///  const re2 = new RRegex("foo")
    ///  expect(re2.capturesLength()).toEqual(1)
    ///
    ///  const re3 = new RRegex("(foo)")
    ///  expect(re3.capturesLength()).toEqual(2)
    ///
    ///  const re4 = new RRegex("(?<a>.(?<b>.))(.)(?:.)(?<c>.)")
    ///  expect(re4.capturesLength()).toEqual(5)
    ///
    ///  const re5 = new RRegex("[a&&b]")
    ///  expect(re5.capturesLength()).toEqual(1)
    /// ```
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.captures_len
    #[wasm_bindgen(js_name = capturesLength)]
    pub fn captures_len(&self) -> usize {
        self.regex.captures_len()
    }

    /// Replaces the leftmost-first match with the replacement provided.
    /// The replacement can be a regular string (where `$N` and `$name` are
    /// expanded to match capture groups) or a function that takes the matches'
    /// `Captures` and returns the replaced string.
    ///
    /// If no match is found, then a copy of the string is returned unchanged.
    ///
    /// # Replacement string syntax
    ///
    /// All instances of `$name` in the replacement text is replaced with the
    /// corresponding capture group `name`.
    ///
    /// `name` may be an integer corresponding to the index of the
    /// capture group (counted by order of opening parenthesis where `0` is the
    /// entire match) or it can be a name (consisting of letters, digits or
    /// underscores) corresponding to a named capture group.
    ///
    /// If `name` isn't a valid capture group (whether the name doesn't exist
    /// or isn't a valid index), then it is replaced with the empty string.
    ///
    /// The longest possible name is used. e.g., `$1a` looks up the capture
    /// group named `1a` and not the capture group at index `1`. To exert more
    /// precise control over the name, use braces, e.g., `${1}a`.
    ///
    /// To write a literal `$` use `$$`.
    ///
    /// # Examples
    ///
    /// Note that this function is polymorphic with respect to the replacement.
    /// In typical usage, this can just be a normal string:
    ///
    /// ```typescript
    /// const re = new Regex("[^01]+")
    /// expect(re.replace("1078910", "").toBe("1010")
    /// ```
    ///
    /// Here's the example using this expansion technique with named capture
    /// groups:
    ///
    /// ```typescript
    /// const re = new Regex("(?P<last>[^,\\s]+),\\s+(?P<first>\\S+)")
    /// const result = re.replace("Springsteen, Bruce", "$first $last")
    /// expect(result).toBe("Bruce Springsteen")
    /// ```
    ///
    /// Note that using `$2` instead of `$first` or `$1` instead of `$last`
    /// would produce the same result. To write a literal `$` use `$$`.
    ///
    /// Sometimes the replacement string requires use of curly braces to
    /// delineate a capture group replacement and surrounding literal text.
    /// For example, if we wanted to join two words together with an
    /// underscore:
    ///
    /// ```typescript
    /// const re = new Regex("(?P<first>\\w+)\\s+(?P<second>\\w+)")
    /// const result = re.replace("deep fried", "${first}_$second")
    /// expect(result).toBe("deep_fried")
    /// ```
    ///
    /// Without the curly braces, the capture group name `first_` would be
    /// used, and since it doesn't exist, it would be replaced with the empty
    /// string.
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.replace
    /// @param {string} text - The string against which to match the regular expression
    /// @param {string} rep - It's a string, it will replace the substring matched by `pattern`.
    /// @returns {string}
    #[wasm_bindgen(skip_jsdoc)]
    pub fn replace(&self, text: &str, rep: &str) -> String {
        self.regex.replace(text, rep).into_owned()
    }

    /// Replaces at most `limit` non-overlapping matches in `text` with the
    /// replacement provided. If `limit` is 0, then all non-overlapping matches
    /// are replaced.
    ///
    /// See the documentation for `replace` for details on how to access
    /// capturing group matches in the replacement string.
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.replacen
    /// @param {string} text - The string against which to match the regular expression
    /// @param {number} limit - Max number of replacement
    /// @param {string} rep - It's a string, it will replace the substring matched by `pattern`.
    /// @returns {string}
    #[wasm_bindgen(skip_jsdoc)]
    pub fn replacen(&self, text: &str, limit: usize, rep: &str) -> String {
        self.regex.replacen(text, limit, rep).into_owned()
    }

    /// Replaces all non-overlapping matches in `text` with the replacement
    /// provided. This is the same as calling `replacen` with `limit` set to
    /// `0`.
    ///
    /// See the documentation for `replace` for details on how to access
    /// capturing group matches in the replacement string.
    ///
    /// See the documentation for `replace` for details on how to access capturing group matches in the replacement string.
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.replace_all
    /// @param {string} text - The string against which to match the regular expression
    /// @param {string} rep - It's a string, it will replace the substring matched by `pattern`.
    /// @returns {string}
    #[wasm_bindgen(skip_jsdoc, js_name = replaceAll)]
    pub fn replace_all(&self, text: &str, rep: &str) -> String {
        self.regex.replace_all(text, rep).into_owned()
    }

    /// Returns an iterator of substrings of `text` delimited by a match of the
    /// regular expression. Namely, each element of the iterator corresponds to
    /// text that *isn't* matched by the regular expression.
    ///
    /// This method will *not* copy the text given.
    ///
    /// # Example
    ///
    /// To split a string delimited by arbitrary amounts of spaces or tabs:
    ///
    /// ```typescript
    /// const re = new Regex(r"[ \\t]+")
    /// const fields = re.split("a b \t  c\td    e")
    /// expect(fields).toEqual(["a", "b", "c", "d", "e"])
    /// ```
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.split
    /// @param {string} text - The string against which to match the regular expression
    /// @returns {string[]}
    #[wasm_bindgen(skip_jsdoc)]
    pub fn split(&self, text: &str) -> Vec<String> {
        self.regex.split(text).map(|s| s.to_string()).collect()
    }

    /// Returns an iterator of at most `limit` substrings of `text` delimited
    /// by a match of the regular expression. (A `limit` of `0` will return no
    /// substrings.) Namely, each element of the iterator corresponds to text
    /// that *isn't* matched by the regular expression. The remainder of the
    /// string that is not split will be the last element in the iterator.
    ///
    /// This method will *not* copy the text given.
    ///
    /// # Example
    ///
    /// Get the first two words in some text:
    ///
    /// ```typescript
    /// const re = new Regex(r"\\W+")
    /// const fields = re.splitn("Hey! How are you?", 3)
    /// expect(fields).toEqual(["Hey", "How", "are you?"])
    /// ```
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.splitn
    /// @param {string} text - The string against which to match the regular expression
    /// @param {number} limit - Max number result elements
    /// @returns {string[]}
    #[wasm_bindgen(skip_jsdoc)]
    pub fn splitn(&self, text: &str, limit: usize) -> Vec<String> {
        self.regex
            .splitn(text, limit)
            .map(|s| s.to_string())
            .collect()
    }

    /// Returns the end location of a match in the text given.
    ///
    /// This method may have the same performance characteristics as
    /// `isMatch`, except it provides an end location for a match. In
    /// particular, the location returned *may be shorter* than the proper end
    /// of the leftmost-first match that you would find via `Regex.find`.
    ///
    /// Note that it is not guaranteed that this routine finds the shortest or
    /// "earliest" possible match. Instead, the main idea of this API is that
    /// it returns the offset at the point at which the internal regex engine
    /// has determined that a match has occurred. This may vary depending on
    /// which internal regex engine is used, and thus, the offset itself may
    /// change.
    ///
    /// # Example
    ///
    /// Typically, `a+` would match the entire first sequence of `a` in some
    /// text, but `shortest_match` can give up as soon as it sees the first
    /// `a`.
    ///
    /// ```typescript
    /// const text = "aaaaa"
    /// const = new Regex("a+").shortest_match(text)
    /// expect(pos).toBe(1)
    /// ```
    ///
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.shortest_match
    /// @param {string} text - The string against which to match the regular expression
    /// @returns {number|undefined}
    #[wasm_bindgen(skip_jsdoc, js_name = shortestMatch)]
    pub fn shortest_match(&self, text: &str) -> Option<usize> {
        self.regex.shortest_match(text)
    }

    /// Returns the same as `shortest_match`, but starts the search at the
    /// given offset.
    ///
    /// The significance of the starting point is that it takes the surrounding
    /// context into consideration. For example, the `\A` anchor can only match
    /// when `start == 0`.
    /// @see https://docs.rs/regex/latest/regex/struct.Regex.html#method.shortest_match_at
    /// @param {string} text - The string against which to match the regular expression
    /// @param {number} start - Zero-based index at which to start matching
    /// @returns {number|undefined}
    #[wasm_bindgen(skip_jsdoc, js_name = shortestMatchAt)]
    pub fn shortest_match_at(&self, text: &str, start: usize) -> Option<usize> {
        if text.len() < start {
            None
        } else {
            self.regex.shortest_match_at(text, start)
        }
    }

    /// Returns the regular expression into a high level intermediate
    /// representation.
    pub fn syntax(&self) -> Result<JsValue> {
        let mut parser = Parser::new();
        let hir = parser
            .parse(self.regex.as_str())
            .map_err(serde_wasm_bindgen::Error::new)?;

        Hir::from(&hir).try_into()
    }

    /// Returns a string representing the regular expression
    #[wasm_bindgen(js_name = toString)]
    pub fn as_string(&self) -> String {
        self.regex.as_str().to_owned()
    }
}
