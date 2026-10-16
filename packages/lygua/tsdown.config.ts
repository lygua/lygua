import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    outputOptions: {
      exports: "named",
    },
  },
  {
    entry: { "lygua.iife": "src/index.ts" },
    format: ["iife"],
    globalName: "Lygua",
    dts: false,
    outputOptions: {
      exports: "named",
    },
  },
]);
