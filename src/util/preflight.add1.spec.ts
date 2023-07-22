import fse from "fs-extra"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import { command, relativeK1Config } from "../../vitest/constants"
import { FILE_SYSTEM_ERROR } from "../constants"
import {
  assertBackupExists,
  assertGameRootExists,
  assertIsNotFinalized,
} from "./preflight"

let tempDirPath: string
beforeAll(() => {
  tempDirPath = temporaryDirectory()
  globalThis.configFile = path.join(tempDirPath, "config.json")
  fse.writeJSONSync(globalThis.configFile, relativeK1Config)
})

// directory state checks
describe("directory state checks", async () => {
  test("fail to assert game root exists", async () => {
    await assertGameRootExists(command)
    expect(mockExit).toHaveBeenCalledWith(FILE_SYSTEM_ERROR)
  })
  test("fail to assert backup folder exists", async () => {
    await assertBackupExists(command)
    expect(mockExit).toHaveBeenCalledWith(FILE_SYSTEM_ERROR)
  })
  test("fail to assert is not finalized", async () => {
    await assertIsNotFinalized(command)
    expect(mockExit).toHaveBeenCalledWith(FILE_SYSTEM_ERROR)
  })
})
