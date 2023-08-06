import type { SpyInstance } from "vitest"
import { vi } from "vitest"

// var is required for globalThis
declare global {
  // noinspection ES6ConvertVarToLetConst
  var initialized: boolean
  // noinspection ES6ConvertVarToLetConst
  var mockExit: SpyInstance<[code?: number | undefined], never>
}

// ensure functions are only mocked once
if (!globalThis.initialized) {
  // convert exits to errors for testing, to prevent early termination while
  // still halting further execution of the tested code
  // noinspection JSUnusedGlobalSymbols
  globalThis.mockExit = vi.spyOn(process, "exit").mockImplementation((args) => {
    throw new Error(args ? args.toString() : "unknown exit")
  })

  // these mocks aren't currently referenced in a test, so no need to store them
  // suppress unnecessary output
  vi.spyOn(process.stderr, "write").mockImplementation(() => false)
  vi.spyOn(process.stdout, "write").mockImplementation(() => false)
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "log").mockImplementation(() => {})

  globalThis.initialized = true
}

afterAll(() => {
  vi.restoreAllMocks()
})
