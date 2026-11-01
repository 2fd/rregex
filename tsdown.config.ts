import { defineConfig, type UserConfig } from "tsdown";

// Every entry is one self-contained file in lib/ next to lib/rregex.wasm.
// bin/build.sh generates js/wasm/ (wasm-bindgen glue and metadata) first.
//
// commonjs, core (cjs) and cf export exactly what core exports, so their
// declarations are the same as core.d.mts: bin/build.sh copies it instead of
// generating them (`dts: false`).
const shared = {
  outDir: "lib",
  clean: false,
  hash: false,
  target: "es2022",
  dts: true,
  deps: { onlyBundle: false },
} satisfies UserConfig;

const ext = (js: string, dts: string) => () => ({ js, dts });

export default defineConfig([
  // Node.js, Deno and Bun
  {
    ...shared,
    entry: { esm: "js/node.ts" },
    platform: "node",
    format: "esm",
    outExtensions: ext(".mjs", ".d.mts"),
    // JSR reads the types from this directive.
    banner: { js: '/* @ts-self-types="./esm.d.mts" */' },
  },
  {
    ...shared,
    entry: { commonjs: "js/node.ts" },
    platform: "node",
    format: "cjs",
    dts: false,
    outExtensions: ext(".cjs", ".d.cts"),
  },
  // Any runtime, the user loads the module
  {
    ...shared,
    entry: { core: "js/core.ts" },
    platform: "neutral",
    format: "esm",
    outExtensions: ext(".mjs", ".d.mts"),
  },
  {
    ...shared,
    entry: { core: "js/core.ts" },
    platform: "neutral",
    format: "cjs",
    dts: false,
    outExtensions: ext(".cjs", ".d.cts"),
  },
  // Browsers and bundlers
  {
    ...shared,
    entry: { web: "js/web.ts" },
    platform: "browser",
    format: "esm",
    outExtensions: ext(".js", ".d.ts"),
  },
  // Cloudflare Workers
  {
    ...shared,
    entry: { cf: "js/workerd.ts" },
    platform: "neutral",
    format: "esm",
    dts: false,
    deps: { onlyBundle: false, neverBundle: [/\.wasm$/] },
    outExtensions: ext(".mjs", ".d.mts"),
  },
  // <script> tag, global `rregex`
  {
    ...shared,
    entry: { standalone: "js/standalone.ts" },
    platform: "browser",
    format: "iife",
    globalName: "rregex",
    dts: false,
    outputOptions: { entryFileNames: "[name].js" },
  },
]);
