/// <refrence types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 50000,
    includeSource: ["src/**/*.{js,ts}"],
  },
});
