import { Command } from "@commander-js/extra-typings"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import { CONFIG_FILE_MISSING } from "../constants"
import { assertConfigFileExists } from "./preflight"

let command: Command<any[], any>
let tempDirPath: string
beforeAll(() => {
  command = new Command()

  tempDirPath = temporaryDirectory()
  globalThis.configFile = path.join(tempDirPath, "config.json")
})

const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
  return undefined as never
})
vi.spyOn(process.stderr, "write").mockImplementation(() => false)
vi.spyOn(console, "error").mockImplementation(() => {})
afterAll(() => {
  vi.restoreAllMocks()
})

// config file existence
describe("config file existence", async () => {
  test("fail to assert default config file exists", async () => {
    await assertConfigFileExists(command)
    expect(mockExit).toHaveBeenCalledWith(CONFIG_FILE_MISSING)
  })
})
