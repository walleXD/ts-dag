/// <refrence types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { target: "es2022" },
  test: {
    testTimeout: 50000,
    includeSource: ["src/**/*.{js,ts}"],
  },
});
