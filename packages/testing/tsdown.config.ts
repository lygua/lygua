import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  globalName: "LyguaTesting",
  dts: true,
  clean: true,
});
