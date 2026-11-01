/**
 * Entry point for Node.js, Deno and Bun. The WebAssembly module is loaded
 * from the file system and instantiated when this module is imported.
 *
 * @module
 */
import { readFileSync } from "node:fs";
import { initSync } from "./core.js";

initSync({ module: readFileSync(new URL("./rregex.wasm", import.meta.url)) });

export * from "./core.js";
