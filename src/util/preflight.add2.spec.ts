import { Command } from "@commander-js/extra-typings"
import path from "node:path"
import { describe } from "node:test"
import temp from "temp"

import { CONFIG_FILE_MISSING } from "../constants"
import { assertConfigFileExists } from "./preflight"

let command: Command<any[], any>
let tempDirPath: string
beforeAll(() => {
  command = new Command()
  temp.track()

  tempDirPath = temp.mkdirSync()
  globalThis.configFile = path.join(tempDirPath, "config.json")
})
// noinspection DuplicatedCode
afterAll(() => {
  temp.cleanupSync()
})

let mockExit: any
let mockStderr: any
let mockConsoleError: any
beforeEach(() => {
  mockExit = jest.spyOn(process, "exit").mockImplementation()
  mockStderr = jest.spyOn(process.stderr, "write").mockImplementation()
  mockConsoleError = jest.spyOn(console, "error").mockImplementation()
})
afterEach(() => {
  mockExit.mockRestore()
  mockStderr.mockRestore()
  mockConsoleError.mockRestore()
})

// config file existence
describe(async () => {
  test("fail to assert default config file exists", async () => {
    await assertConfigFileExists(command)
    expect(mockExit).toHaveBeenCalledWith(CONFIG_FILE_MISSING)
  })
})
