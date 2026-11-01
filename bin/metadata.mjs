// Writes js/wasm/metadata.ts with the build metadata from Cargo.toml and Cargo.lock.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import toml from "toml";

const root = resolve(import.meta.dirname, "..");
const cargo = toml.parse(readFileSync(resolve(root, "Cargo.toml"), "utf8"));
const lock = toml.parse(readFileSync(resolve(root, "Cargo.lock"), "utf8"));
const version = (name) => lock.package.find((pkg) => pkg.name === name).version;

const metadata = {
  name: cargo.package.name,
  description: cargo.package.description,
  authors: cargo.package.authors,
  homepage: cargo.package.homepage,
  repository: cargo.package.repository,
  regex: version("regex"),
  "regex-syntax": version("regex-syntax"),
};

writeFileSync(
  resolve(root, "js/wasm/metadata.ts"),
  `/** Build metadata */\nexport const metadata = ${JSON.stringify(metadata, null, 2)} as const;\n`,
);
