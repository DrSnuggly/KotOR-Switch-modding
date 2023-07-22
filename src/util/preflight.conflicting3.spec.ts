// tests that would conflict with those in ./preflight.conflicting2.spec.ts
import fse from "fs-extra"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import { command, relativeK1Config } from "!/vitest/constants"
import { ALREADY_FINALIZED, finalizedCanaryFileName } from "~/constants"

import { assertIsNotFinalized } from "./preflight"

let tempDirPath: string
beforeAll(() => {
  tempDirPath = temporaryDirectory()
  globalThis.configFile = path.join(tempDirPath, "config.json")
  fse.writeJSONSync(globalThis.configFile, relativeK1Config)
})

// directory state checks
describe("directory state checks", async () => {
  beforeAll(() => {
    const gameRootPath = path.join(tempDirPath, relativeK1Config.gameRoot)
    fse.mkdirSync(gameRootPath)
    fse.writeFile(path.join(gameRootPath, finalizedCanaryFileName), "test")
  })

  test("fail to assert is not finalized", async () => {
    await assertIsNotFinalized(command)
    expect(mockExit).toHaveBeenCalledWith(ALREADY_FINALIZED)
  })
})
