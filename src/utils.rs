use js_sys::{Array, Error};
use wasm_bindgen::JsValue;

#[allow(dead_code)]
pub fn set_panic_hook() {
  // When the `console_error_panic_hook` feature is enabled, we can call the
  // `set_panic_hook` function at least once during initialization, and then
  // we will get better error messages if our code ever panics.
  //
  // For more details see
  // https://github.com/rustwasm/console_error_panic_hook#readme
  #[cfg(feature = "console_error_panic_hook")]
  console_error_panic_hook::set_once();
}
pub trait ToJs {
  fn to_js(&self) -> JsValue;
}

pub fn error<E: ToString>(e: E) -> JsValue {
  let error_message = e.to_string();
  let error = Error::new(&error_message);
  JsValue::from(error)
}

pub fn result<V: ToJs, E: ToString>(r: Result<V, E>) -> JsValue {
  match r {
    Ok(v) => v.to_js(),
    Err(e) => error(e),
  }
}

impl<V: ToJs> ToJs for Option<V> {
  fn to_js(&self) -> JsValue {
    match self {
      Some(v) => v.to_js(),
      None => JsValue::UNDEFINED,
    }
  }
}

impl ToJs for String {
  fn to_js(&self) -> JsValue {
    JsValue::from_str(self)
  }
}

impl ToJs for Vec<JsValue> {
  fn to_js(&self) -> JsValue {
    let arr: Array = Array::new();
    for item in self {
      arr.push(&item);
    }
    JsValue::from(arr)
  }
}

impl ToJs for Vec<usize> {
  fn to_js(&self) -> JsValue {
    let arr: Array = Array::new();
    for item in self {
      arr.push(&JsValue::from(item.to_owned() as f64));
    }
    JsValue::from(arr)
  }
}

impl<T: ToJs> ToJs for Vec<T> {
  fn to_js(&self) -> JsValue {
    let arr: Array = Array::new();
    for item in self {
      arr.push(&item.to_js());
    }
    JsValue::from(arr)
  }
}
