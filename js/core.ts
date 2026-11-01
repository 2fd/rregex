/**
 * Runtime-agnostic entry point. It does not load the WebAssembly module:
 * call {@link init} or {@link initSync} once before you use any export.
 *
 * Every runtime-specific entry point (`node`, `web`, `workerd`, `standalone`)
 * is a thin wrapper on top of this module.
 *
 * @module
 */
import initWasm, {
  initSync as initWasmSync,
  type InitInput,
  type InitOutput,
  type SyncInitInput,
} from "./wasm/rregex.js";

export * from "./wasm/rregex.js";
export { metadata } from "./wasm/metadata.js";

export type { InitInput, SyncInitInput };

export interface InitOptions {
  /** Bytes, a compiled `WebAssembly.Module`, or a `Response`, URL or path to fetch. */
  module_or_path: InitInput | Promise<InitInput>;
}

export interface InitSyncOptions {
  /** Bytes or a compiled `WebAssembly.Module`. */
  module: SyncInitInput;
}

let initialized = false;

/**
 * The raw exports of the WebAssembly instance (`memory`, allocator, bindings),
 * set by {@link init} and {@link initSync}. For tests and debugging only: it
 * is not part of the public API and can change in any release.
 *
 * @internal
 */
export let __wasm: InitOutput | undefined;

/** Returns `true` after the WebAssembly module has been instantiated. */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * Instantiates the WebAssembly module synchronously. Calls after the first
 * successful call have no effect.
 *
 * @param options - The module, or (deprecated) the module passed directly.
 */
export function initSync(options: InitSyncOptions | SyncInitInput): void {
  const module = isOptions(options, "module") ? options.module : options;
  __wasm = initWasmSync({ module });
  initialized = true;
}

/**
 * Instantiates the WebAssembly module asynchronously. Calls after the first
 * successful call have no effect.
 */
export async function init(options: InitOptions): Promise<void> {
  __wasm = await initWasm({ module_or_path: options.module_or_path });
  initialized = true;
}

function isOptions<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype &&
    key in value
  );
}
