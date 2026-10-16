import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
  },
  {
    entry: { "utils.iife": "src/index.ts" },
    format: ["iife"],
    globalName: "LyguaUtils",
    dts: false,
  },
]);
