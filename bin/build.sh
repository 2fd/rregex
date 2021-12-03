wasm-pack build -d lib --out-name browser --release --target web
cp lib/browser.d.ts lib/types.d.ts
mv lib/browser_bg.wasm lib/rregex.wasm
mv lib/browser_bg.wasm.d.ts lib/rregex.wasm.d.ts

wasm-pack build -d lib --out-name commonjs --release --target nodejs

wasm-pack build -d lib --out-name module --release --target bundler

rm lib/module.js
mv lib/module_bg.js lib/module.js

sed -i '' 's/browser_bg.wasm/rregex.wasm/g' lib/browser.js
sed -i '' 's/commonjs_bg.wasm/rregex.wasm/g' lib/commonjs.js
sed -i '' 's/module_bg.wasm/rregex.wasm/g' lib/module.js

# clear files
rm lib/commonjs_bg.wasm
rm lib/commonjs_bg.wasm.d.ts
rm lib/module_bg.wasm
rm lib/module_bg.wasm.d.ts
rm lib/.gitignore
rm lib/package.json
rm lib/README.md
rm lib/LICENSE
