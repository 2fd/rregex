/**
 * Entry point for Cloudflare Workers (workerd). The bundler provides the
 * compiled `WebAssembly.Module`, which is instantiated on import.
 *
 * @module
 */
import wasm from "./rregex.wasm";
import { initSync } from "./core.js";

initSync({ module: wasm });

export * from "./core.js";
