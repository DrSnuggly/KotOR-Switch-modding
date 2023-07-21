import { Command } from "@commander-js/extra-typings"
import fse from "fs-extra"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import { FILE_SYSTEM_ERROR } from "../constants"
import { configData } from "./config"
import {
  assertBackupExists,
  assertGameRootExists,
  assertIsNotFinalized,
} from "./preflight"

// noinspection DuplicatedCode
const relativeK1Config: configData = {
  game: 1,
  languageCode: "en",
  gameRoot: "game-root",
  backupTo: "backup",
  outputTo: "output",
  manualProcessingOutput: "_NEEDS_PROCESSING",
}

let command: Command<any[], any>
let tempDirPath: string
beforeAll(() => {
  command = new Command()

  tempDirPath = temporaryDirectory()
  globalThis.configFile = path.join(tempDirPath, "config.json")
  fse.writeJSONSync(globalThis.configFile, relativeK1Config)
})

const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
  return undefined as never
})
vi.spyOn(process.stderr, "write").mockImplementation(() => false)
vi.spyOn(console, "error").mockImplementation(() => {})
afterAll(() => {
  vi.restoreAllMocks()
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
