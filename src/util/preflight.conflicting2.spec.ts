// tests that would conflict with those in ./preflight.conflicting1.spec.ts
import path from "node:path"
import { temporaryDirectory } from "tempy"

import { CONFIG_FILE_MISSING } from "~/constants"
import { initializeCommand } from "~/initialize"

import { assertConfigFileExists } from "./preflight"

let tempDirPath: string
beforeAll(() => {
  tempDirPath = temporaryDirectory()
  globalThis.configFile = path.join(tempDirPath, "config.json")
})

// config file existence
describe("config file existence", () => {
  test("fail to assert default config file exists", async () => {
    await assertConfigFileExists(initializeCommand)
    expect(mockExit).toHaveBeenCalledWith(CONFIG_FILE_MISSING)
  })
})
