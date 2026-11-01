//! Local bindings to the few JS built-ins the crate uses, instead of `js-sys`.
//! The attributes match `js-sys` 0.3.77 so the generated glue does the same calls.
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "object")]
    #[derive(Clone, Debug)]
    pub type Object;

    #[wasm_bindgen(constructor)]
    pub fn new() -> Object;

    #[wasm_bindgen(static_method_of = Object)]
    pub fn keys(object: &Object) -> Array;

    #[wasm_bindgen(extends = Object, typescript_type = "Array<any>")]
    #[derive(Clone, Debug)]
    pub type Array;

    #[wasm_bindgen(constructor)]
    pub fn new() -> Array;

    #[wasm_bindgen(static_method_of = Array, js_name = of)]
    pub fn of1(a: &JsValue) -> Array;

    #[wasm_bindgen(method)]
    pub fn push(this: &Array, value: &JsValue) -> u32;

    #[wasm_bindgen(method, getter, structural)]
    pub fn length(this: &Array) -> u32;

    #[wasm_bindgen(method, structural, indexing_getter)]
    pub fn get(this: &Array, index: u32) -> JsValue;

    /// `new Uint8Array(view)`: copies the bytes out of wasm memory.
    #[wasm_bindgen(js_name = Uint8Array)]
    pub type Uint8Array;

    #[wasm_bindgen(constructor)]
    pub fn new(bytes: &[u8]) -> Uint8Array;

    #[wasm_bindgen(js_namespace = Reflect, js_name = get, catch)]
    pub fn reflect_get(target: &JsValue, key: &JsValue) -> Result<JsValue, JsValue>;

    #[wasm_bindgen(js_namespace = Reflect, js_name = set, catch)]
    pub fn reflect_set(target: &JsValue, key: &JsValue, value: &JsValue) -> Result<bool, JsValue>;
}
