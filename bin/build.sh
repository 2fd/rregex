#!/bin/bash

echo "  🚀  Building..."
concurrently \
  -c "cyan,blue,green,yellow" \
  -n "std,web,cjs,esm" \
  "wasm-pack build -d lib_no_modules --release --target no-modules" \
  "wasm-pack build -d lib_web --release --target web" \
  "wasm-pack build -d lib_nodejs --release --target nodejs" \
  "wasm-pack build -d lib_deno --release --target deno"

function replace() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '.tmp' -e "$1" $2
  else
    sed -i -e "$1" $2
  fi
}

# fix types
echo "  🩹  Fixing types..."
for t in lib_*/*.d.ts; do
  replace 's/find(text: string): any;/find(text: string): Match | undefined;/g' $t
  replace 's/findAt(text: string, start: number): any;/findAt(text: string, start: number): Match | undefined;/g' $t
  replace 's/findAll(text: string): any;/findAll(text: string): Match[];/g' $t
  replace 's/findAll(text: string): any;/findAll(text: string): Match[];/g' $t
  replace 's/split(text: string): any;/split(text: string): string[];/g' $t
  replace 's/splitn(text: string, limit: number): any;/splitn(text: string, limit: number): string[];/g' $t
  replace 's/syntax(): any;/syntax(): Hir;/g' $t
  replace 's/captureNames(): any\[\];/captureNames(): (string | null)[];/g' $t
  replace 's/captures(text: string): any;/captures(text: string): Captures | undefined;/g' $t
  replace 's/capturesAll(text: string): any;/capturesAll(text: string): Captures[];/g' $t
  replace 's/matches(text: string): any\[\];/matches(text: string): number[];/g' $t
done

echo "  📦  Bundling Cloudflare bundle..."
mkdir -p lib_cf

echo '' > lib_cf/cf.mjs
echo 'import wasm from "./rregex.wasm";'    >> lib_cf/cf.mjs
echo 'import { initSync } from "./web.js";' >> lib_cf/cf.mjs
echo 'export * from "./web.js";'            >> lib_cf/cf.mjs
echo ''                                     >> lib_cf/cf.mjs
echo 'initSync(wasm);'                      >> lib_cf/cf.mjs
echo ''                                     >> lib_cf/cf.mjs

echo "  📝  Adding metadata..."
node bin/medatata.mjs

echo "  🔨  Creating lib..."
mkdir -p lib
cp lib_web/rregex.js lib/web.js
cp lib_web/rregex.d.ts lib/web.d.ts
cp lib_web/rregex.d.ts lib/cf.d.ts
cp lib_web/rregex.d.ts lib/types.d.ts
cp lib_web/rregex_bg.wasm lib/rregex.wasm
cp lib_web/rregex_bg.wasm.d.ts lib/rregex.wasm.d.ts

cp lib_cf/cf.mjs lib/cf.mjs

cp lib_nodejs/rregex.js lib/commonjs.cjs
cp lib_nodejs/rregex.d.ts lib/commonjs.d.ts

cp lib_no_modules/rregex.js lib/standalone.js
cp lib_no_modules/rregex.d.ts lib/standalone.d.ts

cp lib_deno/rregex.d.ts lib/esm.d.ts
echo -e "import { readFile } from \"node:fs/promises\";\n$(cat lib_deno/rregex.js)" > lib/esm.mjs

echo "  🔗  Fixing references..."
replace 's/rregex_bg\.wasm/rregex.wasm/g' lib/web.js

replace 's/rregex_bg\.wasm/rregex.wasm/g' lib/commonjs.cjs
replace 's/__wbindgen_placeholder__/wbg/g' lib/commonjs.cjs

replace 's/\\\.js\$/standalone\\.js$/g' lib/standalone.js
replace 's/_bg\.wasm/rregex.wasm/g' lib/standalone.js

replace 's/rregex_bg\.wasm/rregex.wasm/g' lib/esm.mjs
replace 's/__wbindgen_placeholder__/wbg/g' lib/esm.mjs
replace 's/Deno\.readFile/readFile/g' lib/esm.mjs

echo "  🧹  Removing build files..."
rm -rf lib_web
rm -rf lib_nodejs
rm -rf lib_cf
rm -rf lib_deno
rm -rf lib_no_modules
if [[ "$OSTYPE" == "darwin"* ]]; then
  rm lib/*.tmp
fi

echo "  ✅  Done!"
echo ""
