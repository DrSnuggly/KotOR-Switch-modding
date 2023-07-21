import { defineConfig } from "vitest/config"

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    coverage: {
      reporter: ["json-summary", "json"],
    },
    include: ["src/**/*.spec.ts"],
  },
})
