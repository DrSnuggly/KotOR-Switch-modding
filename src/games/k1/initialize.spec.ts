import fse from "fs-extra"
import os from "node:os"
import path from "node:path"
import { temporaryDirectory } from "tempy"

import { relativeK1Config } from "!/test/constants"
import { FILE_SYSTEM_ERROR } from "~/constants"
import { Initialize } from "~/games/k1/initialize"
import { mainCommand } from "~/main"
import {
  checkSuccessfulInit,
  generateSymlinkPath,
} from "~/steps/initialize/abstractInitialize.spec"
import { Config } from "~/steps/util/config"

export function mockExistingK1Structure(tempDir: string) {
  // nothing too special about this folder, just the last
  // deeply-nested folder in the ./assets/steam-folders.txt file
  // noinspection SpellCheckingInspection
  fse.mkdirSync(
    path.join(
      tempDir,
      relativeK1Config.gameRoot,
      "streamwaves",
      "stn57",
      "c01001"
    ),
    {
      recursive: true,
    }
  )
}

export function checkSuccessfulK1Init(gameDir: string) {
  // noinspection SpellCheckingInspection
  if (
    !fse
      // nothing too special about this folder, just the first
      // deeply-nested folder in the ./assets/steam-folders.txt file
      .statSync(path.join(gameDir, "streamwaves", "globe", "band01"))
      .isDirectory()
  ) {
    // noinspection SpellCheckingInspection
    throw new Error("streamwaves/globe/band01 is not a folder")
  }
}

describe("blank K1 env", () => {
  test("no force, no symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
    }
    config.data = configData

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
    })
    initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test.skipIf(os.platform() === "linux")("no force, with symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
      desktopSymlink: generateSymlinkPath("kotor1"),
    }
    config.data = configData

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
    })
    initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir, configData.desktopSymlink)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
    fse.rmSync(configData.desktopSymlink)
  })
  test("force, no symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
    }
    config.data = configData

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
      force: true,
    })
    initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})

describe("pre-existing K1 config", () => {
  test("no force, no symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
    }
    config.data = configData
    config.save()

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
    })
    expect(() => initialize.run()).toThrowError(FILE_SYSTEM_ERROR.toString())
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("force, no symlink", () => {
    const tempDir = temporaryDirectory()
    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
    }
    config.data = configData
    config.save()

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
      force: true,
    })
    initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})

describe("pre-existing K1 structure", () => {
  test("no force, no symlink", () => {
    const tempDir = temporaryDirectory()
    mockExistingK1Structure(tempDir)

    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
    }
    config.data = configData

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
    })
    expect(() => initialize.run()).toThrowError(FILE_SYSTEM_ERROR.toString())
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
  test("force, no symlink", () => {
    const tempDir = temporaryDirectory()
    mockExistingK1Structure(tempDir)

    const config = new Config(mainCommand, path.join(tempDir, "config.json"))
    const configData = {
      ...relativeK1Config,
      kotor: "1",
    }
    config.data = configData

    const initialize = new Initialize(mainCommand, {
      ...configData,
      config,
      force: true,
    })
    initialize.run()
    expect(() => {
      checkSuccessfulInit(tempDir)
      checkSuccessfulK1Init(config.absoluteGameRoot)
    }).not.toThrow()

    fse.rmSync(tempDir, { recursive: true })
  })
})
