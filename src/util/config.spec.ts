import fse from "fs-extra"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import {
  configData,
  configFileExists,
  getAbsoluteBackupTo,
  getAbsoluteGameRoot,
  getAbsoluteManualProcessingOutput,
  getAbsoluteOutputTo,
  getConfig,
  getConfigParams,
} from "./config"

const relativeK1Config: configData = {
  game: 1,
  languageCode: "en",
  gameRoot: "game-root",
  backupTo: "backup",
  outputTo: "output",
  manualProcessingOutput: "_NEEDS_PROCESSING",
}

// base config retrieval functions
describe("base config retrieval", () => {
  let tempDirPath: string
  let configFile: string
  let configParams: getConfigParams

  beforeAll(() => {
    tempDirPath = temporaryDirectory()
    configFile = path.join(tempDirPath, "config.json")
    configParams = { configFile, force: true }
  })

  test("does non-existent config file exist", () => {
    expect(configFileExists(configFile)).toBeFalsy()
  })
  test("get non-existent config", () => {
    expect(() => getConfig(configParams)).toThrow("ENOENT")
  })

  test("does existing config file exist", () => {
    fse.writeJSONSync(configFile, relativeK1Config)
    expect(configFileExists()).toBeTruthy()
  })
  test("get existing config", () => {
    fse.writeJSONSync(configFile, relativeK1Config)
    expect(() => getConfig(configParams)).not.toThrow("ENOENT")
  })
})

// K1 default config with relative paths
describe("K1 default config with relative paths", () => {
  let tempDirPath: string

  beforeAll(() => {
    tempDirPath = temporaryDirectory()
    globalThis.configFile = path.join(tempDirPath, "config.json")
    fse.writeJSONSync(globalThis.configFile, relativeK1Config)
  })

  test("get gameRoot absolute path from global config relative path", () => {
    expect(getAbsoluteGameRoot()).toEqual(
      path.join(tempDirPath, relativeK1Config.gameRoot)
    )
  })
  test("get backupTo absolute path from global config relative path", () => {
    expect(getAbsoluteBackupTo()).toEqual(
      path.join(tempDirPath, relativeK1Config.backupTo)
    )
  })
  test("get outputTo absolute path from global config relative path", () => {
    expect(getAbsoluteOutputTo()).toEqual(
      path.join(tempDirPath, relativeK1Config.outputTo)
    )
  })
  test(
    "get manualProcessingOutput absolute path from global config relative" +
      " path",
    () => {
      expect(getAbsoluteManualProcessingOutput()).toEqual(
        path.join(tempDirPath, relativeK1Config.manualProcessingOutput)
      )
    }
  )
})

// K1 config with relative paths
describe("K1 config with relative paths", () => {
  let tempDirPath: string
  let configFile: string
  let configParams: getConfigParams

  beforeAll(() => {
    tempDirPath = temporaryDirectory()
    configFile = path.join(tempDirPath, "config.json")
    configParams = { configFile, force: true }
    fse.writeJSONSync(configFile, relativeK1Config)
  })

  test("get gameRoot absolute path from config relative path", () => {
    expect(getAbsoluteGameRoot(configParams)).toEqual(
      path.join(tempDirPath, relativeK1Config.gameRoot)
    )
  })
  test("get backupTo absolute path from config relative path", () => {
    expect(getAbsoluteBackupTo(configParams)).toEqual(
      path.join(tempDirPath, relativeK1Config.backupTo)
    )
  })
  test("get outputTo absolute path from config relative path", () => {
    expect(getAbsoluteOutputTo(configParams)).toEqual(
      path.join(tempDirPath, relativeK1Config.outputTo)
    )
  })
  test("get manualProcessingOutput absolute path from config relative path", () => {
    expect(getAbsoluteManualProcessingOutput(configParams)).toEqual(
      path.join(tempDirPath, relativeK1Config.manualProcessingOutput)
    )
  })
})

// K1 config with absolute paths
describe("K1 config with absolute paths", () => {
  let tempDirPath: string
  let configFile: string
  let configParams: getConfigParams
  let absoluteK1Config: configData

  beforeAll(() => {
    tempDirPath = temporaryDirectory()
    configFile = path.join(tempDirPath, "config.json")
    configParams = { configFile, force: true }

    absoluteK1Config = {
      ...relativeK1Config,
      gameRoot: path.join(tempDirPath, relativeK1Config.gameRoot),
      backupTo: path.join(tempDirPath, relativeK1Config.backupTo),
      outputTo: path.join(tempDirPath, relativeK1Config.outputTo),
      manualProcessingOutput: path.join(
        tempDirPath,
        relativeK1Config.manualProcessingOutput
      ),
    }

    fse.writeJSONSync(configFile, absoluteK1Config)
  })

  test("get gameRoot absolute path from config absolute path", () => {
    expect(getAbsoluteGameRoot(configParams)).toEqual(absoluteK1Config.gameRoot)
  })
  test("get backupTo absolute path from config absolute path", () => {
    expect(getAbsoluteBackupTo(configParams)).toEqual(absoluteK1Config.backupTo)
  })
  test("get outputTo absolute path from config absolute path", () => {
    expect(getAbsoluteOutputTo(configParams)).toEqual(absoluteK1Config.outputTo)
  })
  test("get manualProcessingOutput absolute path from config absolute path", () => {
    expect(getAbsoluteManualProcessingOutput(configParams)).toEqual(
      absoluteK1Config.manualProcessingOutput
    )
  })
})

// K1 config with mixed paths
describe("K1 config with mixed paths", () => {
  let tempDirPath: string
  let configFile: string
  let configParams: getConfigParams
  let mixedK1Config: configData

  beforeAll(() => {
    tempDirPath = temporaryDirectory()
    configFile = path.join(tempDirPath, "config.json")
    configParams = { configFile, force: true }

    mixedK1Config = {
      ...relativeK1Config,
      gameRoot: path.join(tempDirPath, relativeK1Config.gameRoot),
      manualProcessingOutput: path.join(
        tempDirPath,
        relativeK1Config.manualProcessingOutput
      ),
    }

    fse.writeJSONSync(configFile, mixedK1Config)
  })

  test("get gameRoot absolute path from config absolute path", () => {
    expect(getAbsoluteGameRoot(configParams)).toEqual(mixedK1Config.gameRoot)
  })
  test("get backupTo absolute path from config relative path", () => {
    expect(getAbsoluteBackupTo(configParams)).toEqual(
      path.join(tempDirPath, mixedK1Config.backupTo)
    )
  })
  test("get outputTo absolute path from config relative path", () => {
    expect(getAbsoluteOutputTo(configParams)).toEqual(
      path.join(tempDirPath, mixedK1Config.outputTo)
    )
  })
  test("get manualProcessingOutput absolute path from config absolute path", () => {
    expect(getAbsoluteManualProcessingOutput(configParams)).toEqual(
      mixedK1Config.manualProcessingOutput
    )
  })
})
