import fse from "fs-extra"
import crypto from "node:crypto"
import os from "node:os"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import { relativeK1Config, relativeK2Config } from "!/test/constants"
import {
  FILE_SYSTEM_ERROR,
  INVALID_INPUT,
  UNSUPPORTED_GAME,
  UNSUPPORTED_LANGUAGE,
} from "~/constants"
import { mainCommand } from "~/main"

import type { ConfigData } from "./config"
import { Config } from "./config"

describe("config properties", () => {
  test("missing config", () => {
    // while we're not reading from the file system, we will still use the
    // tempDir to ensure we're working with a clean folder
    const tempDir = crypto.randomBytes(20).toString("hex")
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))

    // use absolute<property> where possible, since it will automatically
    // pull info from the non-absolute version

    // data
    expect.soft(() => config.data).toThrowError(FILE_SYSTEM_ERROR.toString())
    mockExit.mockClear()

    // game
    expect.soft(() => config.kotor).toThrowError(FILE_SYSTEM_ERROR.toString())
    mockExit.mockClear()

    // language
    expect
      .soft(() => config.languageCode)
      .toThrowError(FILE_SYSTEM_ERROR.toString())
    mockExit.mockClear()

    // gameRoot
    expect
      .soft(() => config.absoluteGameRoot)
      .toThrowError(FILE_SYSTEM_ERROR.toString())
    mockExit.mockClear()

    // backupTo
    expect
      .soft(() => config.absoluteBackupTo)
      .toThrowError(FILE_SYSTEM_ERROR.toString())
    mockExit.mockClear()

    // outputTo
    expect
      .soft(() => config.absoluteOutputTo)
      .toThrowError(FILE_SYSTEM_ERROR.toString())
    mockExit.mockClear()

    // needsProcessingTo
    expect
      .soft(() => config.absoluteNeedsProcessingTo)
      .toThrowError(FILE_SYSTEM_ERROR.toString())
    mockExit.mockClear()

    // overrideFolder
    expect
      .soft(() => config.absoluteOverrideFolder)
      .toThrowError(FILE_SYSTEM_ERROR.toString())
    mockExit.mockClear()

    // texturesOverrideFolder
    expect
      .soft(() => config.absoluteOverrideTexturesFolder)
      .toThrowError(FILE_SYSTEM_ERROR.toString())
  })
  test.each([
    ["rel K1 no symlink", relativeK1Config],
    ["rel K1 with symlink", { ...relativeK1Config, desktopSymlink: "kotor1" }],
    ["rel K2 no symlink", relativeK2Config],
    ["rel K2 with symlink", { ...relativeK2Config, desktopSymlink: "kotor2" }],
    [
      "mix K1 no symlink",
      {
        ...relativeK1Config,
        gameRoot: temporaryDirectory(),
      },
    ],
    [
      "mix K1 with symlink",
      {
        ...relativeK1Config,
        gameRoot: temporaryDirectory(),
        desktopSymlink: "kotor1",
      },
    ],
    [
      "mix K2 no symlink",
      {
        ...relativeK2Config,
        gameRoot: temporaryDirectory(),
      },
    ],
    [
      "mix K2 with symlink",
      {
        ...relativeK2Config,
        gameRoot: temporaryDirectory(),
        desktopSymlink: "kotor2",
      },
    ],
  ])("good data with %s", (_, configData) => {
    const tempDir = crypto.randomBytes(20).toString("hex")
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    let tempDirRegex: RegExp
    if (os.platform() === "win32") {
      tempDirRegex = new RegExp("^" + tempDir + "\\\\[^\\\\]+$")
    } else {
      tempDirRegex = new RegExp("^" + tempDir + "/[^/]+$")
    }

    // not sure why JSUnresolvedReference is needed below, but it is
    config.data = configData
    expect.soft(config.data).toEqual(configData)
    // noinspection JSUnresolvedReference
    expect.soft(config.kotor).toEqual(configData.kotor)
    // noinspection JSUnresolvedReference
    expect.soft(config.languageCode).toEqual(configData.languageCode)
    // noinspection JSUnresolvedReference
    if (path.isAbsolute(configData.gameRoot)) {
      // noinspection JSUnresolvedReference
      expect.soft(config.absoluteGameRoot).toEqual(configData.gameRoot)
    } else {
      expect.soft(config.absoluteGameRoot).toMatch(tempDirRegex)
    }
    expect.soft(config.absoluteBackupTo).toMatch(tempDirRegex)
    expect.soft(config.absoluteOutputTo).toMatch(tempDirRegex)
    expect.soft(config.absoluteNeedsProcessingTo).toMatch(tempDirRegex)
  })

  test.each([
    // unsupported value
    ["kotor", 0, UNSUPPORTED_GAME],
    ["kotor", 3, UNSUPPORTED_GAME],
    ["kotor", "", UNSUPPORTED_GAME],
    ["kotor", "0", UNSUPPORTED_GAME],
    ["kotor", "3", UNSUPPORTED_GAME],
    // unsupported JSON types
    ["kotor", "string", INVALID_INPUT],
    ["kotor", true, INVALID_INPUT],
    ["kotor", false, INVALID_INPUT],
    ["kotor", null, INVALID_INPUT],
    ["kotor", {}, INVALID_INPUT],
    ["kotor", { key: "value" }, INVALID_INPUT],
    ["kotor", [], INVALID_INPUT],
    ["kotor", [1, 2, 3], INVALID_INPUT],
    // unsupported value
    ["languageCode", "ru", UNSUPPORTED_LANGUAGE],
    // unsupported JSON types
    ["languageCode", 0, INVALID_INPUT],
    ["languageCode", 1, INVALID_INPUT],
    ["languageCode", true, INVALID_INPUT],
    ["languageCode", false, INVALID_INPUT],
    ["languageCode", null, INVALID_INPUT],
    ["languageCode", {}, INVALID_INPUT],
    ["languageCode", { key: "value" }, INVALID_INPUT],
    ["languageCode", [], INVALID_INPUT],
    ["languageCode", ["1", "2", "3"], INVALID_INPUT],
    // unsupported JSON types
    ["gameRoot", 0, INVALID_INPUT],
    ["gameRoot", 1, INVALID_INPUT],
    ["gameRoot", true, INVALID_INPUT],
    ["gameRoot", false, INVALID_INPUT],
    ["gameRoot", null, INVALID_INPUT],
    ["gameRoot", {}, INVALID_INPUT],
    ["gameRoot", { key: "value" }, INVALID_INPUT],
    ["gameRoot", [], INVALID_INPUT],
    ["gameRoot", ["1", "2", "3"], INVALID_INPUT],
    // unsupported JSON types
    ["backupTo", 0, INVALID_INPUT],
    ["backupTo", 1, INVALID_INPUT],
    ["backupTo", true, INVALID_INPUT],
    ["backupTo", false, INVALID_INPUT],
    ["backupTo", null, INVALID_INPUT],
    ["backupTo", {}, INVALID_INPUT],
    ["backupTo", { key: "value" }, INVALID_INPUT],
    ["backupTo", [], INVALID_INPUT],
    ["backupTo", ["1", "2", "3"], INVALID_INPUT],
    // unsupported JSON types
    ["outputTo", 0, INVALID_INPUT],
    ["outputTo", 1, INVALID_INPUT],
    ["outputTo", true, INVALID_INPUT],
    ["outputTo", false, INVALID_INPUT],
    ["outputTo", null, INVALID_INPUT],
    ["outputTo", {}, INVALID_INPUT],
    ["outputTo", { key: "value" }, INVALID_INPUT],
    ["outputTo", [], INVALID_INPUT],
    ["outputTo", ["1", "2", "3"], INVALID_INPUT],
    // unsupported JSON types
    ["needsProcessingTo", 0, INVALID_INPUT],
    ["needsProcessingTo", 1, INVALID_INPUT],
    ["needsProcessingTo", true, INVALID_INPUT],
    ["needsProcessingTo", false, INVALID_INPUT],
    ["needsProcessingTo", null, INVALID_INPUT],
    ["needsProcessingTo", {}, INVALID_INPUT],
    ["needsProcessingTo", { key: "value" }, INVALID_INPUT],
    ["needsProcessingTo", [], INVALID_INPUT],
    ["needsProcessingTo", ["1", "2", "3"], INVALID_INPUT],
  ])("bad property %s: %s", (property, value, errorCode) => {
    const tempDir = crypto.randomBytes(20).toString("hex")
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      [property]: value,
    }

    expect(() => (config.data = configData)).toThrowError(errorCode.toString())
  })

  // missing properties
  test.each([
    "kotor",
    "languageCode",
    "gameRoot",
    "backupTo",
    "outputTo",
    "needsProcessingTo",
  ])("missing property %s", (property) => {
    const tempDir = crypto.randomBytes(20).toString("hex")
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [property as keyof ConfigData]: _, ...configData } =
      relativeK1Config

    expect(() => (config.data = configData)).toThrowError(
      INVALID_INPUT.toString()
    )
  })

  // config nesting
  test.each([["gameRoot"], ["backupTo"], ["outputTo"], ["needsProcessingTo"]])(
    "config nested in %s",
    (property) => {
      const tempDir = temporaryDirectory()
      const config = new Config(mainCommand, path.join(tempDir, "config.json"))
      const configData = { ...relativeK1Config, [property]: tempDir }

      expect(() => (config.data = configData)).toThrowError(
        INVALID_INPUT.toString()
      )

      fse.removeSync(tempDir)
    }
  )

  // folder nesting
  test.each([
    // forward
    ["gameRoot", "backupTo"],
    ["gameRoot", "outputTo"],
    ["gameRoot", "needsProcessingTo"],
    ["backupTo", "outputTo"],
    ["backupTo", "needsProcessingTo"],
    ["outputTo", "needsProcessingTo"],
    // backward
    ["backupTo", "gameRoot"],
    ["backupTo", "outputTo"],
    ["backupTo", "needsProcessingTo"],
    ["outputTo", "needsProcessingTo"],
    ["outputTo", "gameRoot"],
    ["needsProcessingTo", "gameRoot"],
  ])("reflective %s / %s nesting", (property1, property2) => {
    const tempDir = crypto.randomBytes(20).toString("hex")
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      [property1]: path.join(
        relativeK1Config[property2 as keyof ConfigData] as string,
        property1
      ),
    }

    expect(() => (config.data = configData)).toThrowError(
      INVALID_INPUT.toString()
    )
  })
})

describe("config filesystem interactions", () => {
  test("load good data", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    fse.writeJSONSync(config.configFile, relativeK1Config)

    expect(config.data).toEqual(relativeK1Config)

    fse.removeSync(tempDir)
  })
  test("load bad data", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    fse.writeJSONSync(config.configFile, {})

    expect(() => config.data).toThrowError(INVALID_INPUT.toString())

    fse.removeSync(tempDir)
  })
  test("save good data", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))

    config.data = relativeK1Config
    config.save()
    expect(fse.readJSONSync(config.configFile)).toEqual(relativeK1Config)

    fse.removeSync(tempDir)
  })
})
