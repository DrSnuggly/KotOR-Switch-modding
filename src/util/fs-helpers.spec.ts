import fse from "fs-extra"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import { FILE_SYSTEM_ERROR } from "~/constants"
import { initializeCommand } from "~/initialize"

import {
  checksumFile,
  readFileLines,
  tryFileSystemOperation,
} from "./fs-helpers"

const lines = ["line1", "line2", "line3"]
let tempDirPath: string
let tempFilePath: string
beforeAll(() => {
  tempDirPath = temporaryDirectory()
  tempFilePath = path.join(tempDirPath, "config.json")
  fse.writeFileSync(tempFilePath, lines.join("\n"))
})

// file system error wrapper
describe("file system error wrapper", () => {
  test("fail to assert fs op fails without error", async () => {
    await tryFileSystemOperation(() => {
      fse.readJSONSync("wrong-file.json")
    }, initializeCommand)
    expect(mockExit).toHaveBeenCalledWith(FILE_SYSTEM_ERROR)
  })
  test("fs op succeeds without error", async () => {
    await tryFileSystemOperation(() => {
      fse.readFileSync(tempFilePath)
    }, initializeCommand)
    expect(mockExit).not.toHaveBeenCalled()
  })
})

// file read stream
describe("file read stream", () => {
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
