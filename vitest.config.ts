import { defineConfig } from "vitest/config"

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    coverage: {
      reporter: ["json-summary", "json", "html"],
      all: true,
    },
    include: ["src/**/*.spec.ts"],
  },
})
