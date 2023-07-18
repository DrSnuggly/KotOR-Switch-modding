import { Command } from "@commander-js/extra-typings"
import fse from "fs-extra"
import path from "node:path"
import { describe } from "node:test"
import temp from "temp"

import { FILE_SYSTEM_ERROR } from "../constants"
import {
  checksumFile,
  readFileLines,
  tryFileSystemOperation,
} from "./fs-helpers"

let command: Command<any[], any>
let tempDirPath: string
let tempFilePath: string
let lines: string[]
beforeAll(() => {
  command = new Command()
  temp.track()

  tempDirPath = temp.mkdirSync()
  tempFilePath = path.join(tempDirPath, "config.json")
  lines = ["line1", "line2", "line3"]
  fse.writeFileSync(tempFilePath, lines.join("\n"))
})
// noinspection DuplicatedCode
afterAll(() => {
  temp.cleanupSync()
})

// while mock input is only really used in one test, use it for each test
// to avoid tests exiting early if an issue arises
// noinspection DuplicatedCode
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

// file system error wrapper
describe(async () => {
  test("fail to assert fs op fails without error", async () => {
    await tryFileSystemOperation(() => {
      fse.readJSONSync("wrong-file.json")
    }, command)
    expect(mockExit).toHaveBeenCalledWith(FILE_SYSTEM_ERROR)
  })
  test("fs op succeeds without error", async () => {
    await tryFileSystemOperation(() => {
      fse.readFileSync(tempFilePath)
    }, command)
    expect(mockExit).not.toHaveBeenCalled()
  })
})

// file read stream
describe(async () => {
  test("read all lines", async () => {
    const readLines: string[] = []
    await readFileLines(tempFilePath, (line: string) => {
      readLines.push(line)
      expect(lines).toContain(line)
    })
    expect(readLines).toEqual(lines)
  })
  test("read 2 lines then stop", async () => {
    const readLines: string[] = []
    await readFileLines(tempFilePath, (line: string) => {
      readLines.push(line)
      if (readLines.length === 2) return true
    })
    expect(readLines).toEqual(lines.slice(0, 2))
  })
})

// file hashing
test("checksum file", async () => {
  // generated via 'openssl sha1'
  const originalChecksum = "0ab7283988e8f49022d126054947f222cbdf0a52"
  const calculatedChecksum = await checksumFile(tempFilePath)
  expect(calculatedChecksum).toEqual(originalChecksum)
})
