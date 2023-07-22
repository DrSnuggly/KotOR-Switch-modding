import { SpyInstance, vi } from "vitest"

// var is required for globalThis
declare global {
  var initialized: boolean
  var mockExit: SpyInstance<[code?: number | undefined], never>
}

// ensure functions are only mocked once
if (!globalThis.initialized) {
  globalThis.mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
    return undefined as never
  })
  // these mocks aren't currently referenced, so no need to store them
  vi.spyOn(process.stderr, "write").mockImplementation(() => false)
  vi.spyOn(console, "error").mockImplementation(() => {})

  globalThis.initialized = true
}

afterAll(() => {
  vi.restoreAllMocks()
})
