#!/bin/bash
wasm-pack build -d lib --out-name browser --release --target web
cp lib/browser.d.ts lib/types.d.ts
cp lib/browser_bg.wasm lib/rregex.wasm
cp lib/browser_bg.wasm.d.ts lib/rregex.wasm.d.ts

wasm-pack build -d lib --out-name commonjs --release --target nodejs
wasm-pack build -d lib --out-name module --release --target bundler

node bin/medatata.js

rm lib/module.js
cp lib/module_bg.js lib/module.js
rm lib/module_bg.js

# use a single wasm file
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '.tmp' -e 's/browser_bg.wasm/rregex.wasm/g' lib/browser.js
  sed -i '.tmp' -e 's/module_bg.wasm/rregex.wasm/g' lib/module.js
  sed -i '.tmp' -e 's/commonjs_bg.wasm/rregex.wasm/g' lib/commonjs.js
  sed -i '.tmp' -e 's/__wbindgen_placeholder__/wbg/g' lib/commonjs.js
else
  sed -i -e 's/browser_bg.wasm/rregex.wasm/g' lib/browser.js
  sed -i -e 's/module_bg.wasm/rregex.wasm/g' lib/module.js
  sed -i -e 's/commonjs_bg.wasm/rregex.wasm/g' lib/commonjs.js
  sed -i -e 's/__wbindgen_placeholder__/wbg/g' lib/commonjs.js
fi

# fix types
for t in lib/*.d.ts; do
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '.tmp' -e 's/find(text: string): any;/find(text: string): Match | undefined;/g' $t
    sed -i '.tmp' -e 's/findAt(text: string, start: number): any;/findAt(text: string, start: number): Match | undefined;/g' $t
    sed -i '.tmp' -e 's/findAll(text: string): any;/findAll(text: string): Match[];/g' $t
    sed -i '.tmp' -e 's/findAll(text: string): any;/findAll(text: string): Match[];/g' $t
    sed -i '.tmp' -e 's/split(text: string): any;/split(text: string): string[];/g' $t
    sed -i '.tmp' -e 's/splitn(text: string, limit: number): any;/splitn(text: string, limit: number): string[];/g' $t
    sed -i '.tmp' -e 's/syntax(): any;/syntax(): Hir;/g' $t
    sed -i '.tmp' -e 's/matches(text: string): any\[\];/matches(text: string): number[];/g' $t
  else
    sed -i -e 's/find(text: string): any;/find(text: string): Match | undefined;/g' $t
    sed -i -e 's/findAt(text: string, start: number): any;/findAt(text: string, start: number): Match | undefined;/g' $t
    sed -i -e 's/findAll(text: string): any;/findAll(text: string): Match[];/g' $t
    sed -i -e 's/findAll(text: string): any;/findAll(text: string): Match[];/g' $t
    sed -i -e 's/split(text: string): any;/split(text: string): string[];/g' $t
    sed -i -e 's/splitn(text: string, limit: number): any;/splitn(text: string, limit: number): string[];/g' $t
    sed -i -e 's/syntax(): any;/syntax(): Hir;/g' $t
    sed -i -e 's/matches(text: string): any\[\];/matches(text: string): number[];/g' $t
  fi
done

# remove unused files
if [[ "$OSTYPE" == "darwin"* ]]; then
  rm lib/*.tmp
fi
rm lib/browser_bg.wasm
rm lib/browser_bg.wasm.d.ts
rm lib/commonjs_bg.wasm
rm lib/commonjs_bg.wasm.d.ts
rm lib/module_bg.wasm
rm lib/module_bg.wasm.d.ts
rm lib/.gitignore
rm lib/package.json
rm lib/README.md
rm lib/LICENSE
