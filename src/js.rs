//! Local bindings to the few JS built-ins the crate uses, instead of `js-sys`.
//! The attributes match `js-sys` 0.3.77 so the generated glue does the same calls.
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "object")]
    #[derive(Clone, Debug)]
    pub type Object;

    #[wasm_bindgen(static_method_of = Object)]
    pub fn keys(object: &Object) -> Array;

    #[wasm_bindgen(extends = Object, typescript_type = "Array<any>")]
    #[derive(Clone, Debug)]
    pub type Array;

    #[wasm_bindgen(method, getter, structural)]
    pub fn length(this: &Array) -> u32;

    #[wasm_bindgen(method, structural, indexing_getter)]
    pub fn get(this: &Array, index: u32) -> JsValue;

    /// A `catch` import: it keeps `__wbindgen_exn_store` in the wasm exports
    /// (`InitOutput` in the generated `.d.ts`).
    #[wasm_bindgen(js_namespace = Reflect, js_name = get, catch)]
    pub fn reflect_get(target: &JsValue, key: &JsValue) -> Result<JsValue, JsValue>;
}
