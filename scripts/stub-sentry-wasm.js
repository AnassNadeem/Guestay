/**
 * Re-apply Workers-safe stubs after npm install.
 * Prevents Sentry's unused APM WASM from bloating the OpenNext Worker bundle.
 */
const fs = require("fs");
const path = require("path");

const stub = `"use strict";
function create() {
  return { getTransformer() { return undefined; }, transform() { return null; } };
}
module.exports = { create };
module.exports.create = create;
`;

const targets = [
  "node_modules/@apm-js-collab/code-transformer/index.js",
  "node_modules/@apm-js-collab/code-transformer/lib/index.js",
];

for (const rel of targets) {
  const full = path.join(__dirname, "..", rel);
  if (!fs.existsSync(path.dirname(full))) continue;
  fs.writeFileSync(full, stub);
  console.log("[postinstall] stubbed", rel);
}
