import { defineConfig } from "tsdown";

export default defineConfig([
  // 1. ESM for modern monorepo pipelines & bundlers
  {
    entry: ["src/index.ts", "src/digest.ts", "src/polyfill.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
  },
  // 2. Standalone zero-dependency IIFE for direct GAS copy-paste
  {
    entry: { "crypto.iife": "src/index.ts" },
    format: ["iife"],
    globalName: "LyguaCrypto",
    skipNodeModulesBundle: false,
    dts: false,
  },
]);
