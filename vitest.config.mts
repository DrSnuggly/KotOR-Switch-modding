import { defineConfig } from "vitest/config"

import { CustomSequencer } from "./test-sequencer"

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    bail: 1,
    sequence: {
      sequencer: CustomSequencer,
    },
    coverage: {
      enabled: true,
      reporter: ["json-summary", "json", "html"],
      all: true,
    },
    include: ["src/**/*.spec.ts"],
  },
})
