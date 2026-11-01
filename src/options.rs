use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const OPTIONS_TYPE: &'static str = r#"/**
 * Options to compile a `RRegex` or a `RRegexSet`. Every option is optional
 * and only applies to the instance that receives it.
 *
 * # Example
 *
 * ```typescript
 * import { RRegex } from "rregex"
 *
 * // Unicode classes make this pattern exceed the default 10 MiB size limit
 * const re = new RRegex("\\w{200}\\s\\w{200}", { sizeLimit: 200 * 1024 * 1024 })
 * ```
 *
 * @see https://docs.rs/regex/latest/regex/struct.RegexBuilder.html
 */
export type RRegexOptions = {
  /**
   * The approximate size limit, in bytes, of the compiled regular expression.
   * If the compiled regular expression is bigger, the constructor throws.
   *
   * Increase it only for patterns that need it: the compiled program uses
   * WebAssembly memory, which does not shrink after the instance is freed.
   *
   * @default 10485760 (10 MiB)
   * @see https://docs.rs/regex/latest/regex/struct.RegexBuilder.html#method.size_limit
   */
  sizeLimit?: number
  /**
   * The approximate capacity, in bytes, of the cache of transitions used by
   * the lazy DFA. A bigger cache can make searches on big patterns faster.
   * If the cache is too small, the search uses a slower engine, it does not
   * throw.
   *
   * @default 2097152 (2 MiB)
   * @see https://docs.rs/regex/latest/regex/struct.RegexBuilder.html#method.dfa_size_limit
   */
  dfaSizeLimit?: number
  /**
   * The nesting limit of the parser. If the pattern has more nested groups,
   * classes or repetitions, the constructor throws.
   *
   * @default 250
   * @see https://docs.rs/regex/latest/regex/struct.RegexBuilder.html#method.nest_limit
   */
  nestLimit?: number
}"#;

#[wasm_bindgen]
extern "C" {
    /// JS value typed as `RRegexOptions` in the generated declarations.
    #[wasm_bindgen(typescript_type = "RRegexOptions")]
    pub type RRegexOptions;
}

#[derive(Default)]
pub struct RegexOptions {
    pub(crate) size_limit: Option<usize>,
    pub(crate) dfa_size_limit: Option<usize>,
    pub(crate) nest_limit: Option<u32>,
}

/// The JS names of the `RegexOptions` fields.
const FIELDS: [&str; 3] = ["sizeLimit", "dfaSizeLimit", "nestLimit"];

impl RegexOptions {
    /// Reads the options from an optional JS object. wasm-bindgen converts
    /// `undefined` and `null` to `None`, which gives the default options.
    pub fn from_js(value: Option<RRegexOptions>) -> Result<Self, JsError> {
        let Some(value) = value else {
            return Ok(Self::default());
        };
        let value: JsValue = value.into();
        if !value.is_object() {
            return Err(JsError::new("invalid options: expected an object"));
        }
        let object: &crate::js::Object = value.unchecked_ref();

        // Reject unknown keys: a typo such as `sizelimit` must not silently
        // fall back to the default limit.
        let keys = crate::js::Object::keys(object);
        for index in 0..keys.length() {
            let key = keys.get(index).as_string().unwrap_or_default();
            if !FIELDS.contains(&key.as_str()) {
                return Err(JsError::new(&format!(
                    "unknown field `{}`, expected one of `{}`",
                    key,
                    FIELDS.join("`, `")
                )));
            }
        }

        Ok(RegexOptions {
            size_limit: read_integer(object, "sizeLimit", usize::MAX as f64)?.map(|n| n as usize),
            dfa_size_limit: read_integer(object, "dfaSizeLimit", usize::MAX as f64)?.map(|n| n as usize),
            nest_limit: read_integer(object, "nestLimit", u32::MAX as f64)?.map(|n| n as u32),
        })
    }
}

/// Reads `object[key]` as an integer in `0..=max`. `undefined` and `null` give
/// `None`.
fn read_integer(object: &crate::js::Object, key: &str, max: f64) -> Result<Option<f64>, JsError> {
    let value = crate::js::reflect_get(object, &JsValue::from_str(key))
        .map_err(|_| JsError::new(&format!("cannot read `{}`", key)))?;
    if value.is_undefined() || value.is_null() {
        return Ok(None);
    }
    match value.as_f64() {
        Some(n) if n.fract() == 0.0 && (0.0..=max).contains(&n) => Ok(Some(n)),
        _ => Err(JsError::new(&format!(
            "invalid value for `{}`: expected an integer between 0 and {}",
            key, max
        ))),
    }
}

/// `RegexBuilder` and `RegexSetBuilder` have the same methods but no shared
/// trait, so a macro applies the options to both.
macro_rules! apply_options {
    ($builder:expr, $options:expr) => {{
        let builder = $builder;
        let options = $options;
        if let Some(limit) = options.size_limit {
            builder.size_limit(limit);
        }
        if let Some(limit) = options.dfa_size_limit {
            builder.dfa_size_limit(limit);
        }
        if let Some(limit) = options.nest_limit {
            builder.nest_limit(limit);
        }
    }};
}
pub(crate) use apply_options;
