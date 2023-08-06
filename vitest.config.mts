import * as path from "node:path"
import { defineConfig } from "vitest/config"

import { CustomSequencer } from "./test-sequencer"

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    sequence: {
      sequencer: CustomSequencer,
    },
    coverage: {
      provider: "v8",
      enabled: true,
      reporter: ["json-summary", "json", "html"],
      all: true,
    },
    setupFiles: ["test/setup"],
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts"],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "!": path.resolve(__dirname, "./"),
    },
  },
})
