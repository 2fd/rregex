/**
 * Entry point for a classic `<script>` tag. It exposes the global `rregex`.
 * The WebAssembly module is not loaded on load: call `rregex.init()` first.
 *
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/rregex/lib/standalone.js"></script>
 * <script>
 *   rregex.init().then(() => new rregex.RRegex("a+").isMatch("aaa"));
 * </script>
 * ```
 *
 * @module
 */
import { init as initCore, isInitialized, type InitOptions } from "./core.js";

export * from "./core.js";

// `document.currentScript` is only set while the script runs for the first time.
const scriptSrc =
  typeof document !== "undefined" && document.currentScript instanceof HTMLScriptElement
    ? document.currentScript.src
    : undefined;

/**
 * Fetches and instantiates the WebAssembly module. By default it loads
 * `rregex.wasm` from the same location as this script.
 */
export async function init(options?: Partial<InitOptions>): Promise<void> {
  if (isInitialized()) return;
  const module_or_path =
    options?.module_or_path ?? (scriptSrc ? new URL("./rregex.wasm", scriptSrc) : undefined);
  if (module_or_path === undefined) {
    throw new Error("rregex: cannot find rregex.wasm, pass `module_or_path` to init()");
  }
  return initCore({ module_or_path });
}
