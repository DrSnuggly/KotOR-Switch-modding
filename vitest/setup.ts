import { SpyInstance, vi } from "vitest"

// var is required for globalThis
declare global {
  var initialized: boolean
  var mockExit: SpyInstance<[code?: number | undefined], never>
}

// ensure functions are only mocked once
if (!globalThis.initialized) {
  // prevent early exits from preflights
  globalThis.mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
    return undefined as never
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
