import path from "node:path"
import { temporaryDirectory } from "tempy"

import { command } from "!/vitest/constants"
import { CONFIG_FILE_MISSING } from "~/constants"

import { assertConfigFileExists } from "./preflight"

let tempDirPath: string
beforeAll(() => {
  tempDirPath = temporaryDirectory()
  globalThis.configFile = path.join(tempDirPath, "config.json")
})

// config file existence
describe("config file existence", async () => {
  test("fail to assert default config file exists", async () => {
    await assertConfigFileExists(command)
    expect(mockExit).toHaveBeenCalledWith(CONFIG_FILE_MISSING)
  })
})
