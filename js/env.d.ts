// Cloudflare Workers (workerd) bundlers import `.wasm` files as a compiled module.
declare module "*.wasm" {
  const module: WebAssembly.Module;
  export default module;
}
