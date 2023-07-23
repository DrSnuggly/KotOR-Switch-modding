import fse from "fs-extra"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import { command, relativeK1Config } from "!/vitest/constants"
import {
  FILE_SYSTEM_ERROR,
  INVALID_INPUT,
  UNSUPPORTED_LANGUAGE,
} from "~/constants"

import {
  assertBackupExists,
  assertConfigFileExists,
  assertFileDoesNotExist,
  assertFolderIsEmpty,
  assertGameRootExists,
  assertIsNotFinalized,
  assertIsNotNested,
  assertLanguageIsSupported,
  isChild,
  isFolderEmpty,
} from "./preflight"

let tempDirPath: string
beforeAll(() => {
  tempDirPath = temporaryDirectory()
  globalThis.configFile = path.join(tempDirPath, "config.json")
  fse.writeJSONSync(globalThis.configFile, relativeK1Config)
})

// config file existence
describe("config file existence", () => {
  // assertion failure found in preflight.conflicting1.spec.ts
  test("assert default config file exists", async () => {
    await assertConfigFileExists(command)
    expect(mockExit).not.toHaveBeenCalled()
  })
})

// languages
describe("languages", () => {
  test.each([
    { language: "en", exits: false },
    { language: "ja", exits: false },
    { language: "it", exits: false },
    { language: "fr", exits: false },
    { language: "de", exits: false },
    { language: "es", exits: false },
    { language: "zz", exits: true },
  ])(
    '(fail to?) assert language "$language" support',
    ({ language, exits }) => {
      assertLanguageIsSupported(command, language)
      if (exits) {
        expect(mockExit).toHaveBeenCalledWith(UNSUPPORTED_LANGUAGE)
      } else {
        expect(mockExit).not.toHaveBeenCalled()
      }
    }
  )
})

// nesting checks
describe("nesting checks", () => {
  let improperStructurePath: string
  let improperStructurePathChild1: string
  let improperStructurePathChild2: string
  let properStructure1Path: string
  let properStructure1PathChild1: string
  let properStructure1PathChild2: string
  let properStructure2Path: string
  let properStructure2PathChild1: string
  let properStructure2PathChild2: string
  beforeAll(() => {
    improperStructurePath = temporaryDirectory()
    improperStructurePathChild1 = path.join(improperStructurePath, "child1")
    improperStructurePathChild2 = path.join(
      improperStructurePathChild1,
      "child2"
    )

    properStructure1Path = temporaryDirectory()
    properStructure1PathChild1 = path.join(properStructure1Path, "child1")
    properStructure1PathChild2 = path.join(properStructure1Path, "child2")

    properStructure2Path = temporaryDirectory()
    properStructure2PathChild1 = path.join(properStructure2Path, "child1")
    properStructure2PathChild2 = path.join(properStructure2Path, "child2")
  })

  test("parent's child is a child of the parent", () => {
    expect(isChild(properStructure1Path, properStructure1PathChild1)).toBe(true)
  })
  test("parent's child is not a parent of the parent", () => {
    expect(isChild(properStructure1PathChild1, properStructure1Path)).toBe(
      false
    )
  })

  test("fail to assert is bi-directionally not nested", () => {
    assertIsNotNested(
      command,
      { value: improperStructurePathChild1, descriptor: "child1" },
      { value: improperStructurePathChild2, descriptor: "child2" }
    )
    expect(mockExit).toHaveBeenCalledWith(INVALID_INPUT)
  })
  test("assert is bi-directionally not nested", () => {
    assertIsNotNested(
      command,
      { value: properStructure1PathChild1, descriptor: "child1" },
      { value: properStructure1PathChild2, descriptor: "child2" }
    )
    expect(mockExit).not.toHaveBeenCalled()
  })
  test("fail to assert is reverse bi-directionally not nested", () => {
    assertIsNotNested(
      command,
      { value: improperStructurePathChild2, descriptor: "child2" },
      { value: improperStructurePathChild1, descriptor: "child1" }
    )
  })
  test("assert is reverse bi-directionally not nested", () => {
    assertIsNotNested(
      command,
      { value: properStructure1PathChild2, descriptor: "child2" },
      { value: properStructure1PathChild1, descriptor: "child1" }
    )
    expect(mockExit).not.toHaveBeenCalled()
  })
  test("assert unrelated folder is bi-directionally not nested", () => {
    assertIsNotNested(
      command,
      { value: properStructure1PathChild1, descriptor: "child1" },
      { value: properStructure2PathChild2, descriptor: "child2" }
    )
  })

  test("fail to assert is uni-directionally not nested", () => {
    assertIsNotNested(
      command,
      { value: improperStructurePath, descriptor: "parent" },
      { value: improperStructurePathChild1, descriptor: "child1" },
      true
    )
    expect(mockExit).toHaveBeenCalledWith(INVALID_INPUT)
  })
  test("assert is uni-directionally not nested", () => {
    assertIsNotNested(
      command,
      { value: properStructure1PathChild1, descriptor: "child1" },
      { value: properStructure1Path, descriptor: "parent" },
      true
    )
    expect(mockExit).not.toHaveBeenCalled()
  })
})

// folder contents
describe("folder contents", () => {
  let emptyFolderPath: string
  let nonEmptyFolderPath: string
  let forceNonEmptyFolderPath: string
  let assertForceNonEmptyFolderPath: string
  beforeAll(() => {
    emptyFolderPath = temporaryDirectory()
    nonEmptyFolderPath = temporaryDirectory()
    fse.mkdirSync(path.join(nonEmptyFolderPath, "child"))
    forceNonEmptyFolderPath = temporaryDirectory()
    fse.mkdirSync(path.join(forceNonEmptyFolderPath, "child"))
    assertForceNonEmptyFolderPath = temporaryDirectory()
    fse.mkdirSync(path.join(assertForceNonEmptyFolderPath, "child"))
  })

  test("folder is not empty", () => {
    expect(isFolderEmpty(nonEmptyFolderPath)).toBe(false)
  })
  test("folder is empty", () => {
    expect(isFolderEmpty(emptyFolderPath)).toBe(true)
  })

  test("fail to assert folder is empty", async () => {
    await assertFolderIsEmpty(command, nonEmptyFolderPath)
    expect(mockExit).toHaveBeenCalledWith(FILE_SYSTEM_ERROR)
  })
  test("assert folder is empty", async () => {
    await assertFolderIsEmpty(command, emptyFolderPath)
    expect(mockExit).not.toHaveBeenCalled()
  })
  test("assert folder is empty with force", async () => {
    await assertFolderIsEmpty(command, forceNonEmptyFolderPath, true)
    expect(mockExit).not.toHaveBeenCalled()
  })
})

// file existence
describe("file existence", () => {
  let filesFolderPath: string
  let existingFile: string
  let nonExistingFile: string
  let forceExistingFile: string
  beforeAll(() => {
    filesFolderPath = temporaryDirectory()
    existingFile = path.join(filesFolderPath, "file1.txt")
    fse.writeFileSync(existingFile, "test")
    nonExistingFile = path.join(filesFolderPath, "file2.txt")
    forceExistingFile = path.join(filesFolderPath, "file3.txt")
    fse.writeFileSync(forceExistingFile, "test")
  })

  test("fail to assert file does not exist", async () => {
    await assertFileDoesNotExist(command, existingFile)
    expect(mockExit).toHaveBeenCalledWith(INVALID_INPUT)
  })
  test("assert file does not exist", async () => {
    await assertFileDoesNotExist(command, nonExistingFile)
    expect(mockExit).not.toHaveBeenCalled()
  })
  test("assert file does not exist with force", async () => {
    await assertFileDoesNotExist(command, forceExistingFile, true)
    expect(mockExit).not.toHaveBeenCalled()
  })
})

// directory state checks
describe("directory state checks", () => {
  beforeAll(() => {
    fse.mkdirSync(path.join(tempDirPath, relativeK1Config.gameRoot))
    fse.mkdirSync(path.join(tempDirPath, relativeK1Config.backupTo))
  })

  // assertion failure found in preflight.conflicting2.spec.ts
  test("assert game root exists", async () => {
    await assertGameRootExists(command)
    expect(mockExit).not.toHaveBeenCalled()
  })
  // assertion failure found in preflight.conflicting2.spec.ts
  test("assert backup folder exists", async () => {
    await assertBackupExists(command)
    expect(mockExit).not.toHaveBeenCalled()
  })
  // assertion failure found in preflight.conflicting3.spec.ts
  test("assert is not finalized", async () => {
    await assertIsNotFinalized(command)
    expect(mockExit).not.toHaveBeenCalled()
  })
})
