/**
 * Entry point for browsers and bundlers. The WebAssembly module is not loaded
 * on import: call {@link init} (or {@link initSync}) before you use any export.
 *
 * ```ts
 * import init, { RRegex } from "rregex/lib/web.js";
 *
 * await init(); // fetches `rregex.wasm` next to this file
 * new RRegex("a+").isMatch("aaa");
 * ```
 *
 * @module
 */
import { init as initCore, type InitOptions } from "./core.js";

export * from "./core.js";

/**
 * Fetches and instantiates the WebAssembly module. By default it loads
 * `rregex.wasm` from the same location as this file.
 */
export function init(options?: Partial<InitOptions>): Promise<void> {
  return initCore({
    module_or_path: options?.module_or_path ?? new URL("./rregex.wasm", import.meta.url),
  });
}

export default init;
